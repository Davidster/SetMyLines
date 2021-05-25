#!/usr/bin/env bash

aws lambda invoke --function-name SetMyLinesMay24-MaxFlowMinCostHandler-wI9s6fjhGoVC --payload fileb://sampleInput.json out.json &&
cat out.json | jq &&
rm out.json
