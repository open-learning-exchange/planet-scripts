const request = require('request');

const uri = '';
const postUri = '';

const getResources = (callback) => {
  request.get({ uri }, callback);
}

const postCallback = (err, response) => {
  if (err) {
    console.log(err);
  }
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
    return [ 'medium: HTML' ];
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
  return resource[fieldName];
}

const tagResources = (err, response) => {
  const resources = JSON.parse(response.body).rows;
  resources.forEach(({ doc }) => {
    if (doc._id === '_design/resources') {
      return;
    }
    const tags = [].concat(
      createTags(doc, 'subject').map(tag => 'subject: ' + tag),
      createTags(doc, 'languages').map(tag => 'language: ' + tag),
      createTags(doc, 'tags'),
      [ 'language: ' + doc.language ],
      fileType(doc)
    ).reduce(dedupeArray, []).map(tag => tag);
    // console.log({ ...doc, tags });
    request.post({
      uri: postUri,
      body: JSON.stringify({ ...doc, tags }),
      headers: { 'Content-Type': 'application/json' }
    }, postCallback);
  });
}

getResources(tagResources);
