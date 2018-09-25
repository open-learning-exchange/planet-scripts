#!/usr/bin/env node
const request = require('request');

const source = process.argv[2]; // ex https://dev.media.mit.edu:2200/
const sourceUser = process.argv[3];
const sourcePass = process.argv[4];
const target = process.argv[5];
const targetUser = process.argv[6];
const targetPass = process.argv[7];
const db = process.argv[8];
const internalTarget = 'http://localhost:5984/';
const maxReplicators = 3;
const waitTime = 10000;

const replicatorObj = (id) => ({
  'source': dbObj(sourceUser, sourcePass, source + db),
  'target': dbObj(targetUser, targetPass, internalTarget + db),
  'selector': { '_id': id },
  'create_target':  false,
  'owner': targetUser,
  'continuous': false
});

const headersObj = (user, pass) => ({
  'headers': {
    'Authorization': 'Basic ' + new Buffer(user + ':' + pass, 'binary').toString('base64')
  }
});

const dbObj = (user, pass, url) => ({
  ...headersObj(user, pass),
  url
});

const getData = (uri, user, pass, callback) => {
  request.get({ uri: uri + '/_all_docs?include_docs=true', json: true, ...headersObj(user, pass) }, (err, response) => {
    if (response && response.body && response.body.rows) {
      return callback(response.body.rows.map(item => item.doc));
    }
    return [ 'no-response' ];
  }).on('error', (err) => {
    console.log(err);
    setTimeout(() => getData(uri, user, pass, callback), waitTime);
  }).end();
};

const getReplicationData = () => {
  console.log('Getting data from source and target...');
  const getTarget = (sourceData) => getData(target + db, targetUser, targetPass, compareDataAndBeginReplication(sourceData));
  getData(source + db, sourceUser, sourcePass, getTarget);
};

const compareDataAndBeginReplication = (sourceData) => (targetData) => {
  console.log('Comparing source and target documents...');
  const differentData = sourceData.filter((sourceItem) => {
    const targetItem = targetData.find((targetItem) => targetItem._id === sourceItem._id);
    return targetItem === undefined || targetItem._rev !== sourceItem._rev;
  }).concat(targetData.filter(targetItem => sourceData.findIndex(sourceItem => targetItem._id === sourceItem._id) === -1));
  console.log('Differences found: ' + differentData.length);
  runReplication(differentData, 0);
};

const runReplication = (items, index) => {
  const replicatorsCallback = (replicators) => {
    const { completed, running } = runningAndCompletedReplicators(replicators);
    if (running.length >= maxReplicators || replicators[0] === 'no-response') {
      console.log('Replicators full.');
      setTimeout(() => runReplication(items, index), waitTime);
      return;
    }
    if (completed.length > 0) {
      deleteReplicators(completed.map(doc => ({ '_id': doc._id, '_rev': doc._rev, '_deleted': true })));
    }
    addReplicator(items[index]._id, () => runReplication(items, index + 1));
    console.log('Replicating item ' + (index + 1) + ' of ' + items.length);
  }
  if (index >= items.length) {
    return;
  }
  getData(target + '_replicator', targetUser, targetPass, replicatorsCallback);
};

const runningAndCompletedReplicators = (replicators) => replicators.reduce((newReplicators, replicator) => {
  if (replicator._replication_state === 'completed') {
    newReplicators.completed.push(replicator);
  } else if (replicator._id.indexOf('design') === -1) {
    newReplicators.running.push(replicator);
  }
  return newReplicators;
}, { completed: [], running: [] });

const addReplicator = (id, callback) => {
  request.post({ uri: target + '_replicator', body: replicatorObj(id), json: true, ...headersObj(targetUser, targetPass) }, (err, response) => callback());
};

const deleteReplicators = (docs) => {
  request.post({ uri: target + '_replicator/_bulk_docs', body: { docs }, json: true, ...headersObj(targetUser, targetPass) },
    (err, response) => {
      if (!err) { console.log('Completed replicators cleared'); }
    });
};

getReplicationData();
