#!/bin/bash

PROJECT_ROOT=$(cd "$(dirname "$0")/../"; pwd);


cd $PROJECT_ROOT;

if [ -d "./build" ]; then
	rm -rf "./build";
fi;

mkdir "./build";


cat \
	"./source/_config.js" \
	"./source/_server.js" \
	"./source/status.js" \
	> "./build/git-cockpit.js"

chmod +x ./build/git-cockpit.js;

