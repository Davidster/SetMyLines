#!/usr/bin/env bash

cd frontend &&
npm run build &&
rm -rf ../expressLambda/public &&
mv build ../expressLambda/public && 
cd ..
