#! /bin/sh

MAX="$1"
FILE="$2"
CUR=$(cat "$FILE" | grep 'NUMBER OF FAILS' | grep '[0-9]*' -o | head -n 1)

if test "$CUR" -le "$MAX"
then exit 0
else
	echo "TOO MUCH FAILS: $CUR%"
	echo "EXPECTED AT MOST: $MAX%"
	exit 1
fi

