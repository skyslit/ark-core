#!/bin/sh

cd packages/ark-core && jest . \
&& cd ../../packages/ark-backend && jest . \
&& cd ../../packages/ark-frontend && jest . \
&& cd ../../packages/ark-devtools && jest . && cd ../../

echo 'Exit Code' $?
