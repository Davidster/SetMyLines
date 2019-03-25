const AWS = require("aws-sdk");
const dynamodb = new AWS.DynamoDB({ apiVersion: "2012-08-10", region: "us-east-1" });
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
  // TODO
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
  // TODO
  // 1. delete key from subscriptionMap
  // 2. if subscriptionMap is empty, delete user from DB
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
