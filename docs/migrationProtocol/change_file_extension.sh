#!/bin/sh

find ../../modules/node_modules/@colony/purser-core/ -name "*.js" -exec sh -c 'mv "$0" "${0%.js}.ts"' {} \;
