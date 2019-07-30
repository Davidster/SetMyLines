const path = require("path");
const { config: { region, cloudFormationStackName } } = require("../package.json");
const AWS = require("aws-sdk");
AWS.config.region = region;
const cloudformation = new AWS.CloudFormation({ apiVersion: "2010-05-15" });

const LIB_PATH = "./lib/common";
const envVarToCfOutputMap = {
  USER_INFO_TABLE_NAME: "UserInfoTableName",
  CF_STACK_NAME: "CfStackName"
};

const setupEnvVars = async () => {
  process.env.AWS_REGION = region;
  process.env.LIB_PATH = path.resolve(LIB_PATH);

  // get aws resource names from cloudformation stack
  const { Stacks: [ { Outputs } ] } = await cloudformation.describeStacks({ StackName: cloudFormationStackName }).promise();
  console.log(Outputs);
  const getCfOutputValue = outputName => Outputs.find(o => o.OutputKey === outputName).OutputValue;
  const cfEnvVars = Object.keys(envVarToCfOutputMap);
  cfEnvVars.forEach(envVar => {
    process.env[envVar] = Outputs.find(o => o.OutputKey === envVarToCfOutputMap[envVar]).OutputValue;
  });

  console.log("Environment variables automatically set:");
  console.log(`AWS_REGION: ${process.env.AWS_REGION}`);
  console.log(`LIB_PATH: ${process.env.LIB_PATH}`);
  cfEnvVars.forEach(envVar => {
    console.log(`${envVar}: ${process.env[envVar]}`);
  });
};

// main
// TODO: contemplate whether it makes much sense to run these modules simply by calling require().
// it is probably better to expose a function and call it in here. Or maybe create a module in
// backend/lib/common which would allow a run.local file to be placed in the individual services
// ... please contemplate
(async () => {
  await setupEnvVars();
  require("./services/apiHandler/app.local");
  // require("./services/customEmailVerification/lambda");
  // require("./lib/common/user/emailer");
})();
