
NIST_TEST_DATA_FILE = $(PWD)/test-data~

all: builds

test-all: test-nist test-hash

test-nist: all nist-executable
	# node build/test.js > $(NIST_TEST_DATA_FILE)
	cd nist-sts && scripts/run-on-file.sh $(NIST_TEST_DATA_FILE)

# TODO
test-hash:

nist-executable: nist-sts/assess

nist-sts/assess:
	git submodule update --init
	cd nist-sts && $(MAKE)

cli: all
	printf 'haha\nMakefile\nlol' | node build/cli.js

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
	cd nist-sts ; $(MAKE) clean ; true

.PHONY: all test cli clean nist-executable test-all

