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
  'application/octet-stream',
  'no-attachments'
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
    resources;
  request.post({ uri: uri + '/_bulk_docs', body: { docs: data }, json: true }, callback);
}

reuploadAttachments = (resources, index, type, callback) => {
  if (index === resources.length) {
    callback();
    return;
  }
  const resource = resources[index];
  request.get({ uri: uri + '/' + resource._id + '?attachments=true', json: true }, (err, res) => {
    reuploadAttachment(res.body, type,
      (err, response) => reuploadAttachments(resources, index + 1, type, callback));
  });
};

reuploadAttachment = (resource, type, callback) => {
  const attachmentKey = Object.keys(resource._attachments)[0];
  const attachment = resource._attachments[attachmentKey];
  attachment.content_type = type;
  if (attachmentKey.slice(-4) !== '.pdf' && type === 'application/pdf') {
    resource._attachments[attachmentKey + '.pdf'] = attachment;
    delete resource._attachments[attachmentKey];
    delete resource[attachmentKey + '.pdf'];
    request.post({ uri, body: resource, json: true }, callback);
  }
  callback();
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
  console.log('Deleting resources...');
  const [ okResources, badResources ] = resourcesToDelete(resources);
  updateResources(badResources, true, () => getResources(HTMLstep));
};

const HTMLstep = (resources) => {
  console.log('Fixing HTML resources...');
  const htmlResources = resources.filter(resource => resource.doc.openWith === 'index.html').map(resource => {
    resource.doc.openWhichFile = 'index.html';
    resource.doc.mediaType = 'HTML';
    return resource.doc;
  });
  updateResources(htmlResources, false, () => getResources(descriptionStep));
};

const descriptionStep = (resources) => {
  console.log('Fixing array description resources...');
  const badDescriptionResources = resources
    .filter(resource => Array.isArray(resource.doc.description))
    .map(resource => ({ ...resource.doc, description: resource.doc.description[0] }));
  updateResources(badDescriptionResources, false, () => getResources(oggStep));
};

const oggStep = (resources) => {
  console.log('Fixing OGG audio...');
  changeTypeStep(resources, 'application/ogg', 'audio/ogg', () => console.log('Done'));
};

const changeTypeStep = (resources, originalType, newType, callback) => {
  const reuploadResources = resources.filter(resource => {
    const types = attachmentTypes(resource.doc._attachments);
    return types.length === 1 && types[0] === originalType;
  }).map(resource => resource.doc);
  reuploadAttachments(reuploadResources, 0, newType, callback);
};

getResources(deleteStep);

// Initial version where PDF and OGG with incorrect MIME type were reuploaded (now are deleted)

// const pdfStep = (resources) => {
//   console.log('Fixing PDFs...');
//   changeTypeStep(resources, 'application/octet-stream', 'application/pdf', () => getResources(oggStep));
// };
