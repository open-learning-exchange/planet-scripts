const request = require('request');

const uri = '';
const largestNum = 30;

const getResources = (callback) => {
  request.get({ uri }, callback);
}

const totalAttachmentSize = (attachments) => {
  if (!attachments) {
    return -1;
  }
  return Object.keys(attachments).reduce((total, key) => {
    return total + attachments[key].length
  }, 0);
}

const logResults = (largest) => {
  largest.forEach((item, index) => {
    console.log('Resource ' + (index + 1), '\n========\n', item.doc.title, '\n', item.attachments);
  });
}

const findLargest = (err, response) => {
  const largest = JSON.parse(response.body).rows.reduce((largest, item, index, arr) => {
    console.log('Reading doc ' + index + ' of ' + arr.length);
    const doc = item.doc;
    const size = totalAttachmentSize(doc._attachments);
    if (size > largest[0].size) {
      largest.push({ size, doc, attachments: doc._attachments });
      largest = largest.sort((a, b) => a.size - b.size);
      return largest.length > largestNum ? largest.slice(1) : largest;
    }
    return largest;
  }, [ { size: -1, doc: {} } ]);
  logResults(largest);
}

getResources(findLargest);
