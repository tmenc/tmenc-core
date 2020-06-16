#!/bin/sh

if time -f abc true 1>/dev/null 2>/dev/null
then
	RESULT=$(time -f "BENCHMARK %e" sh -c 'build/test/test-benchmark.exe 1>/dev/null 2>/dev/null' 2>&1)
	TIME=$(echo "$RESULT" | grep -o -E -e 'BENCHMARK [0-9]+(\.[0-9]+)?' | grep -o -E -e '[0-9\.]+')
else
	echo "TIME FORMAT NOT SUPPORTED... HOPE FOR THE BEST..." 1>&2

	RESULT=$(time sh -c 'build/test/test-benchmark.exe 1>/dev/null 2>/dev/null' 2>&1)
	TIME=$(echo "$RESULT" | grep -o -e 'real *.*' | grep -o -E -e '[0-9\.ms]+')
fi

echo "$TIME"

