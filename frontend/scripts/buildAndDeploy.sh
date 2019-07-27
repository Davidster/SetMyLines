#!/usr/bin/env bash

# exit script if we can't get the enviroment variables
set -e

ENV_VARS=($(node ../../scripts/getProdEnvVars.js))
STATIC_CLIENT_BUCKET_NAME=${ENV_VARS[1]}
REACT_APP_API_URL=${ENV_VARS[0]} \
npm run build
# don't cache files except in build/static
# see: https://facebook.github.io/create-react-app/docs/production-build#static-file-caching
aws s3 sync ../build s3://$STATIC_CLIENT_BUCKET_NAME --exclude "static/*" --cache-control "max-age=120" --delete
aws s3 sync ../build/static s3://$STATIC_CLIENT_BUCKET_NAME/static --cache-control "max-age=31536000" --delete