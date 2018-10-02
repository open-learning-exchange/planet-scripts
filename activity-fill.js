#!/usr/bin/env node

const request = require('request');

const user = process.argv[2];
const pass = process.argv[3];
const domain = process.argv[4] || 'localhost:5984';
const protocol = process.argv[5] || 'http';
const baseUrl = protocol + '://' + user + ':' + pass + '@' + domain;
const userArray = [ 'q', 'w', 'e', 'r', 'a', 's', 'd', 'f' ];
const resourceArray = [
  '420aca97613804b8e9fef9c82e00aa5c',
  '420aca97613804b8e9fef9c82e00af0c',
  '420aca97613804b8e9fef9c82e00b332',
  '4393724bb71ab348fd9f7e704b032c7d',
  '47b2bf59c96d58704147a870f10c4363'
];
const adminActivityTypes = [ 'login', 'upgrade', 'sync' ];

const newRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
}

const newDate = () => {
  return Date.now() - Math.floor(Math.random() * 100000);
}

const loginActivity = () => {
  const loginTime = newDate();
  return ({
    createdOn: 'paul_test.config',
    parentCode: 'dev',
    user: newRandomItem(userArray),
    loginTime,
    logoutTime: loginTime + Math.floor(Math.random * 10000),
    type: 'login'
  });
}

const adminActivity = () => {
  return ({
    createdOn: 'paul_test.config',
    parentCode: 'dev',
    user: user,
    createdTime: newDate(),
    type: newRandomItem(adminActivityTypes)
  });
}

const resourceActivity = () => {
  return ({
    createdOn: 'paul_test.config',
    parentCode: 'dev',
    user: newRandomItem(userArray),
    time: newDate(),
    activity: 'visit',
    resource: newRandomItem(resourceArray)
  });
}

const numberOfActivities = 25000;
const baseArray = Array(numberOfActivities).fill(0);

const addActivities = (docs, db, callback) => {
  request.post({ uri: baseUrl + '/' + db + '/_bulk_docs', body: { docs }, json: true }, callback);
}

const logMessageCallback = (message) => (err, response) => console.log(message);

const adminActivities = baseArray.map(() => adminActivity());
const resourceActivities = baseArray.map(() => resourceActivity());
const loginActivities = baseArray.map(() => loginActivity());

addActivities(adminActivities, 'activity_logs', logMessageCallback('Admin activities added'));
addActivities(resourceActivities, 'resource_activities', logMessageCallback('Resource activities added'));
addActivities(loginActivities, 'login_activities', logMessageCallback('Login activities added')); 
