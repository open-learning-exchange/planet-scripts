#!/usr/bin/env node
const request = require('request');
const btoa = require('btoa');

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
  updateDocs(configurations.map(config => ({ ...config, parentCode})), 'configurations', () => {
    createConfigurationReplication(configurations[0]);
    console.log('Configurations updated');
  });
}

const createConfigurationReplication = (configuration) => {
  const replicationAddress = protocol + '://' + user + ':' + pass + '@localhost:5984/';
  const replicationObject = {
    // Name the id always after the local database
    '_id': 'configuration_push_' + Date.now(),
    'source': {
      'url': replicationAddress + 'configurations'
    },
    'target': {
      'headers': {
        'Authorization': 'Basic ' + btoa(configuration.adminName + ':' + pass)
      },
      'url': 'https://' + configuration.parentDomain + '/communityregistrationrequests'
    },
    'create_target':  false,
    'owner': user,
    'continuous': false
  };
  request.post({ uri: couchAddress + '_replicator', body: replicationObject, json: true }, () => {
    console.log('Configuration replicating to parent');
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
