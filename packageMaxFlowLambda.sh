#!/usr/bin/env bash

cd maxFlowLambda
virtualenv v-env &&
source v-env/bin/activate &&
python -m pip install ortools &&
deactivate &&
cd v-env/lib/python2.7/site-packages/ &&
zip -rq ../../../../lambda.zip . &&
cd ../../../../ &&
zip -g lambda.zip lambda.py &&
rm -rf v-env &&
cd ..
