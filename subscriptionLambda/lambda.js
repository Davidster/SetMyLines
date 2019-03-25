'use strict';

console.log('Loading function');
const AWS = require("aws-sdk");

exports.handler = (event, context, callback) => {
  console.log('Received event:', JSON.stringify(event, null, 2));
  callback(null);
};
