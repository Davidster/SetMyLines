#!/usr/bin/env bash

COMMON_PATH=$(readlink -f ../sharedLambdaLayer/common) \
USER_INFO_TABLE_NAME=SetMyLinesUserInfo \
RUN_LOCAL=true \
node lambda.local.js
