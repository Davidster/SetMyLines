#!/usr/bin/env bash

cd /opt/yahoo-fantasy-automation/app
DEBUG=app:* CLIENT_ID=$(cat conf/clientID) CLIENT_SECRET=$(cat conf/clientSecret) \
/root/.nvm/versions/node/v10.15.1/bin/npm run start
