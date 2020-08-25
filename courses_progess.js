const request = require('request');

const user = process.argv[2];
const pass = process.argv[3];
const domain = process.argv[4] || 'localhost:5984';
const protocol = process.argv[5] || 'http';

const uri = protocol + '://' + user + ':' + pass + '@' + domain + '/courses_progress/_all_docs?include_docs=true';
const postUri = protocol + '://' + user + ':' + pass + '@' + domain + '/courses_progress';

const batchSize = 500;

const getCourseProgress = (callback) => {
  request.get({ uri, json: true }, callback);
}

const postCallback = (progresses, index) => (err, response) => {
  if (err) {
    console.log(err);
  }
  postInBatches(progresses, index + batchSize);
}

const updateProgresses = (err, response) => {
  const progresses = response.body.rows.map(({ doc }) => {
    if (doc._id.indexOf('_design/') > -1) {
      return;
    }
    if (isNaN(doc.updatedDate)) {
        console.log("Update " + doc.createdOn);
    }
    if (doc.updatedDate && doc.createdDate) {
      return;
    }
    if (isNaN(doc.createdOn)) {
        return { updatedDate: 0, createdDate: 0, ...doc };
    }
    return { updatedDate: doc.createdOn, createdDate: doc.createdOn, ...doc };
  }).filter(progress => progress !== undefined);
  postInBatches(progresses, 0);
}

const postInBatches = (progresses, startIndex) => {
  if (startIndex > progresses.length) {
    return;
  }
  console.log('Updating courses_progress ' + startIndex + ' through ' + (startIndex + batchSize - 1));
  const progressBatch = progresses.slice(startIndex, startIndex + batchSize);
  request.post({
    uri: postUri + '/_bulk_docs',
    body: { docs: progressBatch },
    json: true
  }, postCallback(progresses, startIndex));
}

getCourseProgress(updateProgresses);