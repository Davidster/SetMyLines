#!/usr/bin/env bash

cd /opt/yahoo-fantasy-automation/app
NODE_ENV=production DEBUG=app:* \
/root/.nvm/versions/node/v10.15.1/bin/node /opt/yahoo-fantasy-automation/app/bin/www
