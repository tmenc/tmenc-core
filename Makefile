
NIST_TEST_DATA_FILE = $(PWD)/build/test/test-data~
NIST_DIR = test/nist-sts
NIST_EXECUTABLE = $(NIST_DIR)/assess

TEST_FILES = $(shell ls -d -1 test/*.js)
TEST_SRCS = $(addprefix build/,$(TEST_FILES))

all: builds
builds: | build builds-srcs
tests: | tests-builds-srcs

test-all: test-nist-big test-nist-small test-hash

tests-builds-srcs: $(TEST_SRCS)

$(TEST_SRCS): build/test machine.js test/test-util.js $(TEST_FILES)
	cat machine.js test/test-util.js $(@:build/%=%) > $@

$(NIST_TEST_DATA_FILE): build/test/test-nist.js
	node build/test/test-nist.js > $(NIST_TEST_DATA_FILE)

test-nist-small: $(NIST_EXECUTABLE) $(NIST_TEST_DATA_FILE)
	cd $(NIST_DIR) && scripts/run-on-file.sh $(NIST_TEST_DATA_FILE)

test-nist-big: $(NIST_EXECUTABLE) $(NIST_TEST_DATA_FILE)
	cd $(NIST_DIR) && STREAM_LEN=1000000 scripts/run-on-file.sh $(NIST_TEST_DATA_FILE)

test-hash: build/test build/test/test-hash.js
	node build/test/test-hash.js

build/test: build
	mkdir $@

$(NIST_EXECUTABLE):
	git submodule update --init
	cd $(NIST_DIR) && $(MAKE)

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
	cd $(NIST_DIR) && $(MAKE) clean ; true

.PHONY: all test cli clean nist-executable test-all test-builds-srcs

