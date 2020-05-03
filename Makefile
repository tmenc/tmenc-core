
node: builds
	node build/test.js

builds: | build build/test.js

build:
	mkdir -p $@

build/test.js: machine.js test.js
	cat $^ > $@

