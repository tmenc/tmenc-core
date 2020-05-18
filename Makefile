
HERE = $(PWD)

NODE = node --trace-uncaught

NIST_TEST_DATA_FILE = $(HERE)/build/test/test-data~
NIST_DIR = test/nist-sts
NIST_EXECUTABLE = $(NIST_DIR)/assess

TEST_FILES = $(shell ls -d -1 test/*.js)
TEST_SRCS = $(addprefix build/,$(TEST_FILES))

all: build-js
build-js: | build build-js-srcs
tests: | tests-build-js-srcs

test-all: test-nist-big test-nist-small test-hash test-misc

tests-build-js-srcs: $(TEST_SRCS)

$(TEST_SRCS): build/test src/js/machine.js src/js/util.js test/test-util.js $(TEST_FILES)
	cat src/js/machine.js src/js/util.js test/test-util.js $(@:build/%=%) > $@

$(NIST_TEST_DATA_FILE): build/test/test-nist.js
	$(NODE) build/test/test-nist.js > $(NIST_TEST_DATA_FILE)

test-nist-small: $(NIST_EXECUTABLE) $(NIST_TEST_DATA_FILE)
	cd $(NIST_DIR) && \
		scripts/run-on-file.sh $(NIST_TEST_DATA_FILE) 2>&1 | \
		tee "$(HERE)/build/$@-result"
	test/check-nist-result.sh "10" "$(HERE)/build/$@-result"

test-nist-big: $(NIST_EXECUTABLE) $(NIST_TEST_DATA_FILE)
	cd $(NIST_DIR) && \
		STREAM_LEN=1000000 scripts/run-on-file.sh $(NIST_TEST_DATA_FILE) 2>&1 | \
		tee "$(HERE)/build/$@-result"
	test/check-nist-result.sh "0" "$(HERE)/build/$@-result"

test-hash: build/test build/test/test-hash.js
	$(NODE) build/test/test-hash.js

test-misc: build/test build/test/test-misc.js
	$(NODE) build/test/test-misc.js

build/test: build
	mkdir -p $@

$(NIST_EXECUTABLE):
	git submodule update --init
	cd $(NIST_DIR) && $(MAKE)

cli: all
	printf 'encode\n0a0bff\n0a0b00\nMakefile\n1000\n3\nLICENSE\nbuild/cli-encrypted\nEND' | $(NODE) build/cli.js
	printf 'decode\n0a0bff\nMakefile\n1000\n3\nbuild/cli-encrypted\nbuild/cli-decrypted\nEND' | $(NODE) build/cli.js

build-js-srcs: build/cli.js

build:
	mkdir $@

build/cli.js: src/js/machine.js src/js/util.js src/js/cli.js
	cat $^ > $@

clean:
	rm -rf build
	cd $(NIST_DIR) && $(MAKE) clean ; true

.PHONY: all cli clean nist-executable

