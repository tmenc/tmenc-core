
NIST_TEST_DATA_FILE = $(PWD)/build/test/test-data~
NIST_DIR = test/nist-sts
NIST_EXECUTABLE = $(NIST_DIR)/assess

TEST_FILES = $(shell ls -d -1 test/*.js)
TEST_SRCS = $(addprefix build/,$(TEST_FILES))

all: builds tests
builds: | build builds-srcs
tests: | build/test tests-builds-srcs

test-all: test-nist-big test-nist-small test-hash

tests-builds-srcs: $(TEST_SRCS)

$(TEST_SRCS):
	cat test/test-util.js $($@:build/%s=%) > $@

$(NIST_TEST_DATA_FILE): tests
	node build/test.js > $(NIST_TEST_DATA_FILE)

test-nist-small: tests $(NIST_EXECUTABLE) $(NIST_TEST_DATA_FILE)
	cd test/nist-sts && scripts/run-on-file.sh $(NIST_TEST_DATA_FILE)

test-nist-big: tests $(NIST_EXECUTABLE) $(NIST_TEST_DATA_FILE)
	cd test/nist-sts && STREAM_LEN=1000000 scripts/run-on-file.sh $(NIST_TEST_DATA_FILE)

build/test: build
	mkdir $@

# TODO
test-hash:

$(NIST_EXECUTABLE):
	git submodule update --init
	cd nist-sts && $(MAKE)

cli: all
	printf 'haha\nMakefile\nlol' | node build/cli.js

builds-srcs: build/cli.js

build:
	mkdir $@

build/test.js: machine.js test.js
	cat $^ > $@

build/cli.js: machine.js cli.js util.js
	cat $^ > $@

clean:
	rm -rf build
	cd nist-sts ; $(MAKE) clean ; true

.PHONY: all test cli clean nist-executable test-all

