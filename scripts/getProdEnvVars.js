const path = require("path");
const { config: { region, cloudFormationStackName } } = require("../package.json");
const AWS = require("aws-sdk");
AWS.config.region = region;
const cloudformation = new AWS.CloudFormation({ apiVersion: "2010-05-15" });

// main
(async () => {
  try {
    const { Stacks: [ { Outputs } ] } = await cloudformation.describeStacks({ StackName: cloudFormationStackName }).promise();
    const apiUrl = Outputs.find(o => o.OutputKey === "ApiUrl").OutputValue;
    const staticClientBucketName = Outputs.find(o => o.OutputKey === "StaticClientBucketName").OutputValue;
    console.log(`${apiUrl} ${staticClientBucketName}`);
  } catch(err) {
    console.log(err);
    process.exit(1);
  }
})();