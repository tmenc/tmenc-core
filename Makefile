
all: builds

test: all
	node build/test.js

cli: all
	printf 'haha\nhere\nlol' | node build/cli.js

builds: | build builds2

builds2: build/test.js build/cli.js

build:
	mkdir -p $@

build/test.js: machine.js test.js
	cat $^ > $@

build/cli.js: machine.js cli.js util.js
	cat $^ > $@

clean:
	rm -rf build

.PHONY: all test cli clean

