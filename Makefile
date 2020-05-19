
HERE = $(PWD)
CC = gcc
CFLAGS = -std=c89 -Werror -Wall -pedantic -O0 -g -Wno-unused-function

NODE = node --trace-uncaught

NIST_TEST_DATA_FILE = $(HERE)/build/test/test-data~
NIST_DIR = test/nist-sts
NIST_EXECUTABLE = $(NIST_DIR)/assess

JS_TEST_FILES = $(shell ls -d -1 test/*.js)
JS_TEST_SRCS = $(addprefix build/,$(JS_TEST_FILES))
C_TEST_FILES = $(shell ls -d -1 test/*.c)
C_TEST_FILES_P = $(addprefix build/,$(C_TEST_FILES))
C_TEST_SRCS = $(C_TEST_FILES_P:%.c=%.exe)

all: build-js
build-js: | build build-js-srcs
tests: tests-build-js-srcs test-build-c-srcs

test-all: test-nist-big test-nist-small test-key-compatibility test-js-hash test-js-misc test-js-rng test-js-cli test-c-misc test-c-rng

tests-build-c-csrs: $(C_TEST_SRCS)
tests-build-js-srcs: $(JS_TEST_SRCS)

$(C_TEST_SRCS): build/test src/c/machine.c src/c/util.c test/test-util.h $(C_TEST_FILES)
	cat src/c/machine.c src/c/util.c test/test-util.h $(@:build/%.exe=%.c) > $(@:%.exe=%.c)
	$(CC) $(CFLAGS) -o $@ $(@:%.exe=%.c)

$(JS_TEST_SRCS): build/test src/js/machine.js src/js/util.js test/test-util.js $(JS_TEST_FILES)
	cat src/js/machine.js src/js/util.js test/test-util.js $(@:build/%=%) > $@

$(NIST_TEST_DATA_FILE): build/test/test-nist.exe
	time build/test/test-nist.exe > $@

test-nist-small: $(NIST_EXECUTABLE) $(NIST_TEST_DATA_FILE)
	cd $(NIST_DIR) && \
		OUTPUT_DIRECTORY="$(HERE)/build/$@" \
		scripts/run-on-file.sh $(NIST_TEST_DATA_FILE) 2>&1 | \
		tee "$(HERE)/build/$@-result"
	test/check-nist-result.sh "10" "$(HERE)/build/$@-result"

test-nist-big: $(NIST_EXECUTABLE) $(NIST_TEST_DATA_FILE)
	cd $(NIST_DIR) && \
		STREAM_LEN=1000000 \
		OUTPUT_DIRECTORY="$(HERE)/build/$@" \
		scripts/run-on-file.sh $(NIST_TEST_DATA_FILE) 2>&1 | \
		tee "$(HERE)/build/$@-result"
	test/check-nist-result.sh "0" "$(HERE)/build/$@-result"

test-key-compatibility: $(NIST_TEST_DATA_FILE) build/test/test-nist.js
	$(NODE) build/test/test-nist.js > $(NIST_TEST_DATA_FILE)-js
	diff $(NIST_TEST_DATA_FILE) $(NIST_TEST_DATA_FILE)-js

test-js-hash: build/test build/test/test-hash.js
	$(NODE) build/test/test-hash.js

test-js-misc: build/test build/test/test-misc.js
	$(NODE) build/test/test-misc.js

test-js-rng: build/test build/test/test-rng.js
	$(NODE) build/test/test-rng.js > build/test/test-js-rng.txt
	diff test/rng-test-data.txt build/test/test-js-rng.txt

test-c-misc: build/test build/test/test-misc.exe
	./build/test/test-misc.exe

test-c-rng: build/test build/test/test-rng.exe
	./build/test/test-rng.exe > build/test/test-c-rng.txt
	diff test/rng-test-data.txt build/test/test-c-rng.txt

test-js-cli: all
	printf 'encrypt\n0a0bff\n0a0b00\nMakefile\n1000\n3\nLICENSE\nbuild/cli-encrypted\nEND' | $(NODE) build/cli.js
	printf 'decrypt\n0a0bff\nMakefile\nbuild/cli-encrypted\nbuild/cli-decrypted\nEND' | $(NODE) build/cli.js
	diff LICENSE build/cli-decrypted

build/test: build
	mkdir -p $@

$(NIST_EXECUTABLE):
	git submodule update --init
	cd $(NIST_DIR) && $(MAKE)

build-js-srcs: build/cli.js

build:
	mkdir $@

build/cli.js: src/js/machine.js src/js/util.js src/js/cli.js
	cat $^ > $@

clean:
	rm -rf build
	cd $(NIST_DIR) && $(MAKE) clean ; true

.PHONY: all clean nist-executable test-key-compatibility test-all test-nist-big test-nist-small test-key-compatibility test-js-hash test-js-misc test-js-rng test-js-cli test-c-misc test-c-rng build-js tests

