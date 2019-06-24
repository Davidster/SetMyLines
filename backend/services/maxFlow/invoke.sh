#!/usr/bin/env bash

aws lambda invoke --function-name AwsServerlessExpressStack-MaxFlowMinCostHandler-HPOV94CZ43HY --payload file://sampleInput.json out.json &&
cat out.json | python -m json.tool &&
rm out.json
