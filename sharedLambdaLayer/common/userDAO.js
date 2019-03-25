const AWS = require("aws-sdk");
const ddbConfig = { apiVersion: "2012-08-10", region: "us-east-1" };
const dynamodb = new AWS.DynamoDB(ddbConfig);
const documentClient = new AWS.DynamoDB.DocumentClient(ddbConfig);
const TABLE_NAME = process.env.USER_INFO_TABLE_NAME;

let putUserItem = userItem => {
  return new Promise((resolve, reject) => {
    dynamodb.putItem({
      TableName: TABLE_NAME,
      Item: AWS.DynamoDB.Converter.marshall(userItem)
    }, (err, data) => {
      if (err) { return reject(err); }
      resolve();
    });
  });
};

let getUserItem = userID => {
  return new Promise((resolve, reject) => {
    dynamodb.getItem({
      TableName: TABLE_NAME,
      Key: AWS.DynamoDB.Converter.marshall({
        userID: userID
      })
    }, (err, data) => {
      if (err) { return reject(err); }
      resolve(data.Item ? AWS.DynamoDB.Converter.unmarshall(data.Item) : undefined);
    });
  });
}

let deleteUserItem = userID => {
  return new Promise((resolve, reject) => {
    dynamodb.deleteItem({
      TableName: TABLE_NAME,
      Key: AWS.DynamoDB.Converter.marshall({
        userID: userID
      })
    }, (err, data) => {
      if (err) { return reject(err); }
      resolve();
    });
  });
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

  if(Object.keys(userItem.subscriptionMap).length === 0) {
    await deleteUserItem(userID);
  } else {
    userItem.accessToken = accessToken;
    userItem.lastUpdateTime = new Date().toString();
    await putUserItem(userItem);
  }
};

let getSubscriptions = async (userID) => {
  let userItem = await getUserItem(userID);
  if(userItem && userItem.subscriptionMap) {
    return userItem.subscriptionMap;
  }
  return {};
};

module.exports.putSubscription = putSubscription;
module.exports.getSubscriptions = getSubscriptions;
module.exports.deleteSubscription = deleteSubscription;
module.exports.getAllUsers = getAllUsers;
