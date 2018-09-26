#!/usr/bin/env node
const request = require('request');
const idsToFix = require('./ids-fix-somalia.json');

const source = process.argv[2]; // ex https://dev.media.mit.edu:2200/
const sourceUser = process.argv[3];
const sourcePass = process.argv[4];
const target = process.argv[5];
const targetUser = process.argv[6];
const targetPass = process.argv[7];
const db = process.argv[8];
const internalTarget = 'http://localhost:5984/';
const maxReplicatorSize = 26214400; // 25 MB
const runningReplicatorSize = 0;
const waitTime = 10000;

const replicatorObj = (id) => ({
  'source': dbObj(sourceUser, sourcePass, source + db),
  'target': dbObj(targetUser, targetPass, internalTarget + db),
  'selector': { '_id': id },
  'create_target':  false,
  'owner': targetUser,
  'continuous': false,
  'docId': id
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
    // console.log(response.body);
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
  console.log('Getting data from source...');
  getData(source + db, sourceUser, sourcePass, compareDataAndBeginReplication);
};

const compareDataAndBeginReplication = (sourceData) => {
  const data = sourceData.filter((sourceItem) => {
    return idsToFix.find(id => sourceItem._id === id);
  });
  console.log('Docs found: ' + data.length);
  runReplication(data, 0);
};

const calculateAttachmentSize = (docs) => {
  return docs.reduce(
    (totalSize, doc) => totalSize + Object.keys(doc._attachments).reduce(
      (docSize, attachmentName) => docSize + doc._attachments[attachmentName].length, 0
    ), 0
  );
}

const getDocsFromReplicators = (replicators, allDocs) => {
  return replicators.map(replicator => allDocs.find(doc => doc._id === replicator.docId));
}

const runReplication = (items, index) => {
  const replicatorsCallback = (replicators) => {
    const { completed, running } = runningAndCompletedReplicators(replicators);
    const runningSize = calculateAttachmentSize(getDocsFromReplicators(running, items));
    const nextDocSize = calculateAttachmentSize([ items[index] ]);
    if ((running.length > 0 && runningSize + nextDocSize >= maxReplicatorSize) || replicators[0] === 'no-response') {
      console.log('Replicators full. (' + (runningSize + nextDocSize) + ')');
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
