const request = require('request');

const uri = '';

const getResources = (callback) => {
  request.get({ uri }, callback);
}

const attachmentTypes = (attachments) => {
  if (!attachments) {
    return [];
  }
  return Object.keys(attachments).map((key) => {
    return attachments[key].content_type
  });
}

const uniqueCount = (array) => {
  return array.reduce((obj, item) => {
    if (!obj[item]) {
      obj[item] = 0;
    }
    obj[item]++;
    return obj;
  }, {});
}

const logResults = (allTypes) => {
  const counts = uniqueCount(allTypes);
  Object.keys(counts).forEach((key) => {
    console.log(key, ': ', counts[key]);
  });
}

const findLargest = (err, response) => {
  const allTypes = JSON.parse(response.body).rows.reduce((all, item, index, arr) => {
    // console.log('Reading doc ' + index + ' of ' + arr.length);
    const doc = item.doc;
    const types = attachmentTypes(doc._attachments);
    if (types.length > 0) {
      return all.concat(types);
    }
    return all;
  }, []);
  logResults(allTypes);
}

getResources(findLargest);
