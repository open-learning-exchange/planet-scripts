#!/usr/bin/env node
const request = require('request');

const user = process.argv[2];
const pass = process.argv[3];
const parentCode = process.argv[4];
const domain = process.argv[5] || 'localhost:2200';
const protocol = process.argv[6] || 'http';

const couchAddress = protocol + '://' + user + ':' + pass + '@' + domain + '/';
const allDocsEndpoint = '/_all_docs?include_docs=true';
let code = '';
let resources = [];
let courses = [];

const getDocs = (db, callback) => {
  request.get({ uri: couchAddress + db + allDocsEndpoint, json: true },
    (err, response) => 
    callback(response.body.rows.map(row => row.doc).filter(doc => doc._id.indexOf('_design') === -1)));
};

const updateDocs = (docs, db, callback) => {
  request.post({
    uri: couchAddress + db + '/_bulk_docs',
    body: { docs },
    json: true
  }, callback);
};

const addParentToConfiguration = (configurations) => {
  updateDocs(configurations.map(config => ({ ...config, parentCode})), () => {
    console.log('Configurations updated');
  });
}

const appendPlanetCodes = (array, codeField) => {
  return array.map(item => ({ ...item, parentCode, [codeField]: code }));
};

const addTitleToLog = (array) => {
  return array.map(item => {
    const relatedArray = item.type === 'course' ? courses : resources;
    const titleField = item.type === 'course' ? 'courseTitle' : 'title';
    return { ...item, title: titleFromId(relatedArray, item.resource || item.resourceId || item.item, titleField) };
  });
};

const resourceActivitiesUpdate = (docs, codeField) => {
  return ratingsUpdate(docs, codeField).map(rActivity => {
    const { activity, ...newLog } = rActivity;
    return { ...newLog, type: activity };
  });
};

const ratingsUpdate = (docs, codeField) => {
  return addTitleToLog(appendPlanetCodes(docs, codeField));
};

const titleFromId = (array, id, titleField) => {
  const doc = array.find(item => item._id === id);
  return doc ? doc[titleField] : undefined;
};

const getCourses = () => {
  getDocs('courses', (docs) => {
    courses = docs;
    getResources();
  });
};

const getResources = () => {
  getDocs('resources', (docs) => {
    resources = docs;
    updateDatabases();
  });
};

getDocs('configurations', (configurations) => {
  code = configurations[0].code;
  addParentToConfiguration(configurations);
  getCourses();
});

const updateDatabase = (db, updateFunction, codeField = 'createdOn') => {
  getDocs(db, (docs) => {
    updateDocs(updateFunction(docs, codeField), db, () => console.log(db + ' updated'));
  });
};

const updateDatabases = () => {
  updateDatabase('login_activities', appendPlanetCodes);
  updateDatabase('_users', appendPlanetCodes, 'planetCode');
  updateDatabase('feedback', appendPlanetCodes, 'source');
  updateDatabase('resource_activities', resourceActivitiesUpdate);
  updateDatabase('ratings', ratingsUpdate);
  updateDatabase('courses_progress', appendPlanetCodes);
  updateDatabase('submissions', appendPlanetCodes, 'source');
};
