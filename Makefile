
node: all
	node build/test.js

all: builds

builds: | build builds2

builds2: build/test.js

build:
	mkdir -p $@

build/test.js: machine.js test.js
	cat $^ > $@

