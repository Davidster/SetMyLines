const path = require("path");
const cfnLambda = require("cfn-lambda");

const { createVerificationTemplate,
        updateVerificationTemplate,
        deleteVerificationTemplate } = require(path.resolve(process.env.LIB_PATH, "user/emailer"));

exports.handler = cfnLambda({
  AsyncCreate: createVerificationTemplate,
  AsyncUpdate: updateVerificationTemplate,
  AsyncDelete: deleteVerificationTemplate
});