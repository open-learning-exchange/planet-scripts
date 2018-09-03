const request = require('request');
// example: 'http://user:password@domain:port/'
const baseUrl = 'http://test:test@localhost:2200/';

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
  "createdDate": Date.now(),
  "updatedDate": Date.now()
}
const numberOfTags = 100;
const numberOfResources = 10000;

const addResource = (resources, callback) => {
  request.post({ uri: baseUrl + 'resources/_bulk_docs', body: { docs: resources }, json: true }, callback);
}

const newTags = (tags) => {
  if (Math.random() > 0.95) {
    return tags;
  }
  const newTag = 'Test' + Math.ceil(Math.random() * numberOfTags);
  return newTags(tags.concat([ newTag ]));
}

const prepareResource = (resourceCount) => {
  const newResource = Object.assign({}, resourceTemplate);
  newResource.title = 'Tag Test ' + resourceCount;
  newResource.tags = newTags([]);
  return newResource;
}

const addAllResources = () => {
  let resources = [];
  for (var i = 0; i < numberOfResources; i++) {
    resources.push(prepareResource(i + 1)); 
  }
  addResource(resources, (err, res) => {
    //console.log(res);
  });
}

addAllResources();
