const uuidv4 = require("uuid/v4");
const AWS = require("aws-sdk");
const ddbConfig = { apiVersion: "2012-08-10", region: "us-east-1" };
const documentClient = new AWS.DynamoDB.DocumentClient(ddbConfig);
const TABLE_NAME = process.env.USER_INFO_TABLE_NAME;

let putUserItem = userItem => {
  return documentClient.put({
    TableName: TABLE_NAME,
    Item: userItem
  }).promise();
};

let getUserItem = async userID => {
  const { Item } = await documentClient.get({
    TableName: TABLE_NAME,
    Key: {
      userID: userID
    }
  }).promise();
  return Item;
};

let deleteUserItem = userID => {
  return documentClient.delete({
    TableName: TABLE_NAME,
    Key: {
      userID: userID
    }
  }).promise();
};

let getAllUsers = async () => {
    const params = { TableName: TABLE_NAME };
    let scanResults = [];
    let items;
    do {
      items = await documentClient.scan(params).promise();
      items.Items.forEach((item) => scanResults.push(item));
      params.ExclusiveStartKey  = items.LastEvaluatedKey;
    } while(typeof items.LastEvaluatedKey != "undefined");

    return scanResults;
};

let putSubscription = async (userID, accessToken, teamKey, stat) => {
  let userItem = await getUserItem(userID);
  console.log(userItem);
  if(!userItem) {
    userItem = {
      userID: userID,
      subscriptionMap: {}
    };
  }
  userItem.subscriptionMap[teamKey] = stat;
  userItem.accessToken = accessToken;
  userItem.lastUpdateTime = new Date().toString();
  await putUserItem(userItem);
};

let deleteSubscription = async (userID, accessToken, teamKey, stat) => {
  let userItem = await getUserItem(userID);
  if(!userItem || !userItem.subscriptionMap) {
    return;
  }

  delete userItem.subscriptionMap[teamKey];

  // if the user no longer has any subscriptions, there is no need to keep the accessToken
  if(Object.keys(userItem.subscriptionMap).length === 0) {
    delete userItem.accessToken;
  } else {
    userItem.accessToken = accessToken;
  }
  userItem.lastUpdateTime = new Date().toString();
  await putUserItem(userItem);
};

let getSubscriptions = async (userID) => {
  let userItem = await getUserItem(userID);
  if(userItem && userItem.subscriptionMap) {
    return userItem.subscriptionMap;
  }
  return {};
};

let putEmail = async (userID, emailAddress) => {
  let userItem = await getUserItem(userID);
  if(!userItem) {
    userItem = {
      userID: userID
    };
  }
  if(userItem.email && userItem.email.address === emailAddress) {
    return userItem.email;
  }
  userItem.email = {
    address: emailAddress,
    isEnabled: true
  };
  userItem.lastUpdateTime = new Date().toString();
  await putUserItem(userItem);
  return userItem.email;
};

let deleteEmail = async (userID) => {
  let userItem = await getUserItem(userID);
  if(!userItem || !userItem.email) {
    return;
  }
  delete userItem.email;
  userItem.lastUpdateTime = new Date().toString();
  await putUserItem(userItem);
};

let enableEmail = async (userID, enable) => {
  let userItem = await getUserItem(userID);
  if(!userItem || !userItem.email || userItem.email.isEnabled === enable) {
    return userItem.email;
  }
  userItem.email.isEnabled = enable;
  userItem.lastUpdateTime = new Date().toString();
  await putUserItem(userItem);
  return userItem.email;
};

let getEmail = async userID => {
  let userItem = await getUserItem(userID);
  if(userItem) {
    return userItem.email;
  }
};

module.exports.getAllUsers = getAllUsers;
module.exports.getFullUserItem = getUserItem;
module.exports.putSubscription = putSubscription;
module.exports.getSubscriptions = getSubscriptions;
module.exports.deleteSubscription = deleteSubscription;
module.exports.putEmail = putEmail;
module.exports.deleteEmail = deleteEmail;
module.exports.getEmail = getEmail;
module.exports.enableEmail = enableEmail;
