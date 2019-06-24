#!/usr/bin/env bash

cd frontend &&
npm run build &&
rm -rf ../backend/services/apiHandler/public &&
mv build ../backend/services/apiHandler/public &&
cd ..
