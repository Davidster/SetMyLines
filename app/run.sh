#!/usr/bin/env bash

DEBUG=app:* CLIENT_ID=$(cat ../conf/clientID) CLIENT_SECRET=$(cat ../conf/clientSecret) npm start
