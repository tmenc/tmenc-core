
node: build/test.js
	node build/test.js

build/test.js: machine.js test.js
	cat $^ > $@

