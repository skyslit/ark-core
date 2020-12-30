#!/bin/sh

cd packages/ark-core && jest . \
&& cd ../../packages/ark-backend && jest . \
&& cd ../../packages/ark-frontend && jest . \
&& cd ../../packages/ark-devtools && jest . \
&& cd ../../packages/ark-cli && jest . && cd ../../

echo 'Exit Code' $?

retVal=$?
if [ $retVal -ne 0 ]; then
    echo "Error"
fi
exit $retVal