const request = require('request');
const url = '';

const resourceTemplate = {
  "title": "Test",
  "author": "",
  "year": "",
  "description": "test",
  "tags": [],
  "language": "",
  "publisher": "",
  "linkToLicense": "",
  "subject": [
    "Agriculture"
  ],
  "level": [
    "Early Education"
  ],
  "openWith": "",
  "resourceFor": null,
  "medium": "",
  "resourceType": "",
  "addedBy": "test",
  "openUrl": null,
  "openWhichFile": "",
  "isDownloadable": "",
  "sourcePlanet": "test36",
  "resideOn": "test36",
  "createdDate": 1532370597861,
  "updatedDate": 1532370597861
}
const numberOfTags = 100;
const numberOfResources = 10000;
let resourceCount = 1;

const addResource = (resource, callback) => {
  request.post({ url, body: resource, json: true }, callback);
}

const newTags = (tags) => {
  if (Math.random() > 0.95) {
    return tags;
  }
  const newTag = 'Test' + Math.ceil(Math.random() * numberOfTags);
  return newTags(tags.concat([ newTag ]));
}

const prepareResource = () => {
  const newResource = Object.assign({}, resourceTemplate);
  newResource.title = 'Tag Test ' + resourceCount;
  newResource.tags = newTags([]);
  return newResource;
}

const addAllResources = () => {
  addResource(prepareResource(), (err, res) => {
    //console.log(res);
    resourceCount++;
    if (resourceCount > numberOfResources) {
      return;
    }
    addAllResources();
  });
}

addAllResources();
