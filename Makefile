
HERE = $(PWD)
CC = gcc

FAST_FLAGS = -Ofast
DEBUG_FLAGS = -std=c89 -Werror -Wall -pedantic -O0 -g -Wno-unused-function
CFLAGS = $(DEBUG_FLAGS)
# CFLAGS = $(FAST_FLAGS)

NODE = node --trace-uncaught

NIST_TEST_DATA_FILE = $(HERE)/build/test/test-data
NIST_DIR = test/nist-sts
NIST_EXECUTABLE = $(NIST_DIR)/assess
NIST_MAKEFILE = $(NIST_DIR)/makefile

JS_TEST_FILES = $(shell ls -d -1 test/*.js)
JS_TEST_SRCS = $(addprefix build/,$(JS_TEST_FILES))
C_TEST_FILES = $(shell ls -d -1 test/*.c)
C_TEST_FILES_P = $(addprefix build/,$(C_TEST_FILES))
C_TEST_SRCS = $(C_TEST_FILES_P:%.c=%.exe)

all: build-js
build-js: | build build-js-srcs
tests: tests-build-js-srcs test-build-c-srcs

test-all: test-changes test-quality
test-quality:
	$(MAKE) CFLAGS=$(FAST_FLAGS) test-nist-big test-nist-small test-js-hash
test-changes: test-key-compatibility test-js-misc test-c-misc test-js-rng test-c-rng test-js-cli test-c-cli

tests-build-c-csrs: $(C_TEST_SRCS)
tests-build-js-srcs: $(JS_TEST_SRCS)

$(C_TEST_SRCS): build/test src/c/machine.c src/c/util.c test/test-util.h $(C_TEST_FILES)
	cat src/c/machine.c src/c/util.c test/test-util.h $(@:build/%.exe=%.c) > $(@:%.exe=%.c)
	$(CC) $(CFLAGS) -o $@ $(@:%.exe=%.c)

$(JS_TEST_SRCS): build/test src/js/machine.js src/js/util.js test/test-util.js $(JS_TEST_FILES)
	cat src/js/machine.js src/js/util.js test/test-util.js $(@:build/%=%) > $@

$(NIST_TEST_DATA_FILE): build/test/test-nist.exe
	build/test/test-nist.exe > $@

# $(NIST_TEST_DATA_FILE): build/test/test-nist.js
# 	$(NODE) build/test/test-nist.js > $@

BENCHMARK_COMMIT =

benchmark-dirty:
	$(MAKE) benchmark BENCHMARK_COMMIT=false

benchmark:
	if [ -z "$(BENCHMARK_COMMIT)" ] ; then if ! [ -z "$$(git status --short 2>&1)" ] ; then echo "STASH CHANGES FIRST!" ; exit 1 ; fi ; fi
	$(MAKE) CFLAGS=$(FAST_FLAGS) 'build/test/test-benchmark.exe'

	TRIMED=$$(python measure-time.py | tail -n 1) && \
	echo "TIME: $$TRIMED" && \
	GIT=$$(git rev-parse HEAD) && \
	SRC=$$(tar -cf - src test | md5sum | cut '-d ' -f 1) && \
	if [ -z "$(BENCHMARK_COMMIT)" ] ; \
	then echo "$$SRC,$$GIT,$$TRIMED" >> ./benchmarks.csv && \
	git commit --all --message "BENCHMARK $$TRIMED" ; \
	fi && \
	true

unchanged-referencefile:
	$(MAKE) $(NIST_TEST_DATA_FILE) CFLAGS=$(FAST_FLAGS)
	mv $(NIST_TEST_DATA_FILE) $(NIST_TEST_DATA_FILE)-reference

unchanged-checkfile-remake:
	$(MAKE) $(NIST_TEST_DATA_FILE) CFLAGS=$(FAST_FLAGS)
	mv $(NIST_TEST_DATA_FILE) $(NIST_TEST_DATA_FILE)-check

unchanged-checkfile:
	if git stash | grep -q -i -e 'No local changes to save' ; then echo "NOTHING CHANGED" ; exit 1 ; fi
	if [ -f $(NIST_TEST_DATA_FILE)-reference ] ; \
	then cp $(NIST_TEST_DATA_FILE)-reference $(NIST_TEST_DATA_FILE)-check || exit 1 ; \
	else $(MAKE) unchanged-checkfile-remake || exit 1 ; \
	fi
	git stash pop

unchanged-check:
	$(MAKE) unchanged-checkfile
	$(MAKE) $(NIST_TEST_DATA_FILE) CFLAGS=$(FAST_FLAGS)
	diff -q $(NIST_TEST_DATA_FILE) $(NIST_TEST_DATA_FILE)-check

# ls -lh build/test/benchmark.bin
# stat -c %s build/test/benchmark.bin

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
	diff -q $(NIST_TEST_DATA_FILE) $(NIST_TEST_DATA_FILE)-js

test-js-hash: build/test build/test/test-hash.js
	$(NODE) build/test/test-hash.js

test-js-misc: build/test build/test/test-misc.js
	$(NODE) build/test/test-misc.js

test-js-rng: build/test build/test/test-rng.js
	$(NODE) build/test/test-rng.js > build/test/test-js-rng.txt
	diff -q test/rng-test-data.txt build/test/test-js-rng.txt

test-c-misc: build/test build/test/test-misc.exe
	./build/test/test-misc.exe

build/cli.c: src/c/machine.c src/c/util.c src/c/cli.c
	cat $^ > $@

build/tmenc-cli: build build/cli.c
	$(CC) $(CFLAGS) -o $@ build/cli.c

test-c-cli: build/tmenc-cli
	printf 'encrypt\nTest-Password\n0a0b00\ntest/test-keyfile.txt\n1000\n100\ntest/testfile\nbuild/cli-encrypted-c\nEND' | build/tmenc-cli
	diff -q test/testfile-encrypted build/cli-encrypted-c
	printf 'decrypt\nTest-Password\ntest/test-keyfile.txt\nbuild/cli-encrypted-c\nbuild/cli-decrypted-c\nEND' | build/tmenc-cli
	diff -q test/testfile build/cli-decrypted-c

test-c-rng: build/test build/test/test-rng.exe
	./build/test/test-rng.exe > build/test/test-c-rng.txt
	diff -q test/rng-test-data.txt build/test/test-c-rng.txt

test-js-cli: all
	printf 'encrypt\nTest-Password\n0a0b00\ntest/test-keyfile.txt\n1000\n100\ntest/testfile\nbuild/cli-encrypted\nEND' | $(NODE) build/cli.js
	diff -q test/testfile-encrypted build/cli-encrypted
	printf 'decrypt\nTest-Password\ntest/test-keyfile.txt\nbuild/cli-encrypted\nbuild/cli-decrypted\nEND' | $(NODE) build/cli.js
	diff -q test/testfile build/cli-decrypted

generate-entropy: build/test build/test/test-entropy.exe
	./build/test/test-entropy.exe > build/test/entropy.txt

build/test:
	mkdir -p $@ || true

$(NIST_EXECUTABLE): $(NIST_MAKEFILE)
	cd $(NIST_DIR) && $(MAKE)

$(NIST_MAKEFILE):
	git submodule update --init

build-js-srcs: build/cli.js

build:
	mkdir $@ || true

build/cli.js: src/js/machine.js src/js/util.js src/js/cli.js
	cat $^ > $@

clean:
	rm -rf build
	cd $(NIST_DIR) && $(MAKE) clean ; true

.PHONY: all clean nist-executable test-key-compatibility test-all test-nist-big test-nist-small test-key-compatibility test-js-hash test-js-misc test-js-rng test-js-cli test-c-misc test-c-rng build-js tests

