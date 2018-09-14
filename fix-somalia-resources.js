const request = require('request');

const user = process.argv[2];
const pass = process.argv[3];
const domain = process.argv[4] || 'localhost:5984';
const protocol = process.argv[5] || 'http';

const badTypes = [
  'video/quicktime',
  'video/x-flv',
  'video/flv',
  'video/3gpp',
];

const badTitles = [
  'Image Resource',
  'PDF Resource (PDF Reader)',
  'Word File Resource (Download)',
  'CSV Resource (Download)',
  'Text Resource (Open File)',
  'Mathematics',
  'dogi',
  'Docker configurations',
  'Somali Dictionary',
  'Girl Rising In Nepal A Girl, A Writer, A Powerful Story.',
  'الموائع والكثافة',
  'الضغط عند نقطة باطن السائل',
  'ضغط جوي',
  'جهاز المانومتر وتطبيقاته',
  'قاعدة بسكال وتطبيقاتها',
  'مبادئ الضغط',
  'الموائع المتحركة',
  'معادلة الإستمرارية',
  'اللزوجة',
  'تكسّر كرات الدم والتصاقها معا',
  'Properties of Matter - Syllabus and Overview'
];

const uri = protocol + '://' + user + ':' + pass + '@' + domain + '/resources';

const getResources = (callback) => {
  request.get({ uri: uri + '/_all_docs?include_docs=true', json: true }, (err, response) => callback(response.body.rows));
};

const updateResources = (resources, isDelete, callback) => {
  const data = isDelete ? 
    resources.map(resource => ({ ...resource.doc, '_deleted': true })) :
    resources.map(resource => resource.doc);
  request.post({ uri: uri + '/_bulk_docs', body: { docs: data }, json: true }, callback);
}

reuploadAttachments = (resources, callback) => {

};

const existsInArray = (item, array) => array.indexOf(item) > -1;

const attachmentTypes = (attachments) => {
  if (!attachments) {
    return [ 'no-attachments' ];
  }
  return Object.keys(attachments).map((key) => {
    return attachments[key].content_type
  });
};

const resourcesToDelete = (resources) => {
  return resources.reduce(([ okResources, badResources ], resource) => {
    const types = attachmentTypes(resource.doc._attachments),
      title = resource.doc.title;
    const isBadType = types.reduce((isBad, type) => isBad || existsInArray(type, badTypes), false);
    if (isBadType || existsInArray(title, badTitles)) {
      badResources.push(resource);
    } else {
      okResources.push(resources);
    }
    return [ okResources, badResources ];
  }, [ [], []]);
};

const deleteStep = (resources) => {
  const [ okResources, badResources ] = resourcesToDelete(resources);
  badResources.forEach((resource) => console.log(resource.doc.title));
  updateResources(badResources, true, () => getResources(HTMLstep));
};

const HTMLstep = (resources) => {
  const htmlResources = resources.filter(resource => resource.doc.openWith === 'HTML').map(resource => {
    resource.doc.openWith = 'index.html';
    resource.doc.mediaType = 'HTML';
    return resource;
  });
  updateResources(htmlResources, false, () => getResources(descriptionStep));
};

const descriptionStep = (resources) => {
  const badDescriptionResources = resources
    .filter(resource => Array.isArray(resource.doc.description))
    .map(resource => ({ ...resource, description: resource.description[0] }));
  updateResources(badDescriptionResources, false, () => getResources(pdfStep));
};

const pdfStep = (resources) => {
  const reuploadPdfResources = resources.filter(resource => {
    const types = attachmentTypes(resources._attachments);
    return types.length === 1 && types[0] === 'application/octet-stream';
  });

};

//getResources(deleteStep);

request.get({ uri: 'http://peace:builder@pirate.ole.org:26082/resources/002df5029d490ff332ae5f939abd2fae?attachments=true', json: true },
  (err, response) => console.log(response.body));

