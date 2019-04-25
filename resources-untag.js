#!/usr/bin/env node
const request = require('request');

const user = process.argv[2];
const pass = process.argv[3];
const domain = process.argv[4] || 'localhost:5984';
const protocol = process.argv[5] || 'http';

const uri = (db) => `${protocol}://${user}:${pass}@${domain}/${db}/_all_docs?include_docs=true`;
const postUri = (db) => `${protocol}://${user}:${pass}@${domain}/${db}`;

const batchSize = 500;

const getData = (db, callback) => {
  request.get({ uri: uri(db), json: true }, callback);
}

const postCallback = (db, docs, index, del) => (err, response) => {
  if (err) {
    console.log(err);
  }
  postInBatches(db, docs, index + batchSize, del);
}

const dedupeArray = (newArray, item) => {
  if (newArray.indexOf(item) > -1) {
    return newArray;
  }
  return newArray.concat(item);
};

const isBadTag = (tag) =>
  [ 'subject:', 'language:', 'medium:' ].find(prefix => tag.indexOf(prefix) > -1) !== undefined

const untagResources = (err, response) => {
  const resources = response.body.rows.map(({ doc }) => {
    if (doc._id.indexOf('_design/') > -1) {
      return;
    }
    if (!doc.tags) {
      return doc;
    }
    const tags = doc.tags
      .filter(tag => !isBadTag(tag))
      .reduce(dedupeArray, []).map(tag => tag);
    return { ...doc, tags };
  }).filter(resource => resource !== undefined);
  postInBatches('resources', resources, 0);
}

const deleteBadTags = (err, response) => {
  const tags = response.body.rows.filter(({ doc }) =>
    doc._id.indexOf('_design/') === -1 && isBadTag(doc._id)
  ).map(({ doc }) => doc);
  postInBatches('tags', tags, 0, true);
};

const postInBatches = (db, docs, startIndex, del = false) => {
  if (startIndex > docs.length) {
    return;
  }
  console.log(`Updating ${db} ${startIndex} through ${(startIndex + batchSize - 1)}`);
  const batch = docs.slice(startIndex, startIndex + batchSize);
  request.post({
    uri: postUri(db) + '/_bulk_docs',
    body: { docs: batch.map(item => del ? { ...item, '_deleted': true } : item) },
    json: true
  }, postCallback(db, docs, startIndex, del));
}

getData('resources', untagResources);
getData('tags', deleteBadTags);
