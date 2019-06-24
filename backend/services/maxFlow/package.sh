#!/usr/bin/env bash

python3 -m venv v-env &&
source v-env/bin/activate &&
python3 -m pip install ortools &&
deactivate &&
cd v-env/lib64/python3.6/site-packages/
zip -rq ../../../../lambda.zip . &&
cd ../../../../ &&
zip -g lambda.zip lambda.py &&
rm -rf v-env
