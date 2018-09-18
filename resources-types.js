const request = require('request');

const uri = '';

const getResources = (callback) => {
  request.get({ uri }, callback);
}

const attachmentTypes = (attachments) => {
  if (!attachments) {
    return [ 'no-attachments' ];
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

const equalsTypes = (types) => {
  // Uncomment to list resource titles of that type
  const equalTypes = [
    // 'application/msword',
    // 'application/vnd.ms-excel',
    // 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    // 'application/x-sh',
    // 'application/vnd.android.package-archive',
    // 'application/ogg',
    // 'image/jpg',
    // 'image/svg+xml',
    // 'image/x-icon',
    // 'image/png',
    // 'image/jpeg'
    // 'application/octet-stream'
    // 'video/quicktime',
    // 'video/x-flv',
    // 'video/webm',
    // 'video/flv',
    // 'video/3gpp',
    // 'video/ogg'
  ];
  return types.reduce((isMatch, type) => {
    return isMatch || (equalTypes.indexOf(type) > -1);
  }, false);
}

const findLargest = (err, response) => {
  let count = 0;
  const allTypes = JSON.parse(response.body).rows.reduce((all, item, index, arr) => {
    const doc = item.doc;
    const types = attachmentTypes(doc._attachments);
    if (equalsTypes(types)) {
      count++;
      console.log(doc.title);
    }
    if (types.length > 0) {
      return all.concat(types);
    }
    return all;
  }, []);
  console.log('Total:' + count);
  logResults(allTypes);
}

getResources(findLargest);
