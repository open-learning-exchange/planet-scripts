const request = require('request');

const user = process.argv[2];
const pass = process.argv[3];
const domain = process.argv[4] || 'localhost:5984';
const protocol = process.argv[5] || 'http';

const uri = protocol + '://' + user + ':' + pass + '@' + domain + '/resources/_all_docs?include_docs=true';
const postUri = protocol + '://' + user + ':' + pass + '@' + domain + '/resources';

const batchSize = 500;

const getResources = (callback) => {
  request.get({ uri, json: true }, callback);
}

const postCallback = (resources, index) => (err, response) => {
  if (err) {
    console.log(err);
  }
  postInBatches(resources, index + batchSize);
}

const dedupeArray = (newArray, item) => {
  if (newArray.indexOf(item) > -1) {
    return newArray;
  }
  return newArray.concat(item);
};

const fileType = (resource) => {
  if (resource._attachments === undefined) {
    return [];
  }
  const attachments = Object.entries(resource._attachments);
  if (attachments.length === 0) {
    return [];
  }
  if (resource.mediaType === 'HTML') {
    return [ 'medium: html' ];
  }
  const detailedTypeArr = attachments[0][1].content_type.split('/');
  if ([ 'video', 'audio', 'image' ].indexOf(detailedTypeArr[0]) > -1) {
    return [ 'medium: ' + detailedTypeArr[0] ];
  }
  if (detailedTypeArr[1] === 'pdf') {
    return [ 'medium: ' + detailedTypeArr[1] ];
  }
  return [];
}


const createTags = (resource, fieldName) => {
  if (resource[fieldName] === undefined) {
    return [];
  }
  return Array.isArray(resource[fieldName]) ? resource[fieldName] : [ resource[fieldName] ];
}

const tagResources = (err, response) => {
  const resources = response.body.rows.map(({ doc }) => {
    if (doc._id.indexOf('_design/') > -1) {
      return;
    }
    const tags = [].concat(
      createTags(doc, 'subject').map(tag => 'subject: ' + tag),
      createTags(doc, 'languages').map(tag => 'language: ' + tag),
      createTags(doc, 'tags'),
      [ 'language: ' + doc.language ],
      fileType(doc)
    ).map(tag => tag.toLowerCase()).reduce(dedupeArray, []).map(tag => tag);
    return { ...doc, tags };
  }).filter(resource => resource !== undefined);
  postInBatches(resources, 0);
}

const postInBatches = (resources, startIndex) => {
  if (startIndex > resources.length) {
    return;
  }
  console.log('Updating resources ' + startIndex + ' through ' + (startIndex + batchSize - 1));
  const resourceBatch = resources.slice(startIndex, startIndex + batchSize);
  request.post({
    uri: postUri + '/_bulk_docs',
    body: { docs: resourceBatch },
    json: true
  }, postCallback(resources, startIndex));
}

getResources(tagResources);
