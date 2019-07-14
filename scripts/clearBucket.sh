#!/usr/bin/env bash

# exit script if we can't get the enviroment variables
set -e

ENV_VARS=($(node getProdEnvVars.js))
STATIC_CLIENT_BUCKET_NAME=${ENV_VARS[1]}
aws s3 rm s3://$STATIC_CLIENT_BUCKET_NAME --recursive