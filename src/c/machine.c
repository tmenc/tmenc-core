
#define DEBUG

#include <stdio.h>
#include <stdlib.h>
#include <stddef.h> /* size_t */

typedef unsigned long largeint_t;

typedef unsigned char bit;
typedef unsigned char bit_container;
#define BITS_IN_SIZEOF 8
#define CONTAINER_BITS (BITS_IN_SIZEOF * (sizeof(bit_container)))

/************
   BITARRAY
 ************/

struct bitarr_s {
	bit_container *buffer;
	size_t bit_size;
};
typedef struct bitarr_s bitarr;

static bit
nth_bit(bit_container x, int n) {
	return (x >> n) & 1;
}

static size_t
bitarray_length(bitarr arr) {
	return arr.bit_size;
}

static bit
bitarray_at(bitarr arr, size_t at) {
	size_t byte_pos = at / CONTAINER_BITS;
	int byte_shift = at % CONTAINER_BITS;

#ifdef DEBUG
	if (at >= arr.bit_size) {
		printf("OUT OF BOUNDS: %lu ; BIT_SIZE = %lu\n", (unsigned long)at, (unsigned long)arr.bit_size);
	}
#endif

	return (nth_bit(arr.buffer[byte_pos], byte_shift));
}

static void
bitarray_set_bit(bitarr arr, size_t at, bit value) {
	size_t bi = at / CONTAINER_BITS;
	int offset = at % CONTAINER_BITS;
	bit_container b;
	bit_container a;
	bit_container x;
	bit_container y;

#ifdef DEBUG
	if (at >= arr.bit_size) {
		printf("OUT OF BOUNDS: %lu ; BIT_SIZE = %lu\n", (unsigned long)at, (unsigned long)arr.bit_size);
	}
#endif

	b = arr.buffer[bi];
	a = ((bit_container) value) << offset;
	x = ((bit_container) 1) << offset;
	y = b ^ ((b & x) ^ (a & x));
	arr.buffer[bi] = y;
}

static size_t
bitarray_byte_length(bitarr arr) {
	return (1 + (arr.bit_size / (BITS_IN_SIZEOF * (sizeof(bit_container)))));
}

static bitarr
bitarray_alloc(size_t bit_size) {
	bitarr ret;
	size_t size;

	ret.bit_size = bit_size;
	size = bitarray_byte_length(ret);
	ret.buffer = malloc(size);
	if (ret.buffer == NULL) {
		printf("COULD NOT ALLOCATE BUFFER OF SIZE %lu\n", (unsigned long)size);
	}

	return ret;
}

/***************
   DOUBLE TAPE
 ***************/
struct double_tape_body_s {
	struct double_tape_body_s *left;
	struct double_tape_body_s *right;
	largeint_t current;
};

struct double_tape_s {
	struct double_tape_body_s *me;
};
typedef struct double_tape_s double_tape;

#define DOUBLE_TAPE_DEFAULT_VALUE 0

static struct double_tape_body_s*
double_tape_body_alloc(struct double_tape_body_s *left, struct double_tape_body_s *right) {
	struct double_tape_body_s *ret;

	ret = malloc(sizeof(struct double_tape_s));
	if (ret == NULL) {
		printf("COULD NOT ALLOCATE DOUBLE TAPE\n");
	}

	ret->current = DOUBLE_TAPE_DEFAULT_VALUE;
	ret->left = left;
	ret->right = right;

	return ret;
}

static double_tape
double_tape_create() {
	double_tape ret;
	ret.me = double_tape_body_alloc(NULL, NULL);
	return ret;
}

static void
double_tape_move_left(double_tape tape) {
	if (tape.me->left == NULL) {
		tape.me->left = double_tape_body_alloc(NULL, tape.me);
	}
	tape.me = tape.me->left;
}

static void
double_tape_move_right(double_tape tape) {
	if (tape.me->right == NULL) {
		tape.me->right = double_tape_body_alloc(tape.me, NULL);
	}
	tape.me = tape.me->right;
}

static largeint_t
double_tape_get(double_tape tape) {
	return tape.me->current;
}

static void
double_tape_set(double_tape tape, largeint_t value) {
	tape.me->current = value;
}

struct tm_s {
	size_t machine_len;
	size_t machine_pos;
	bitarr machine_bits;
};

typedef struct tm_s tm;

static struct tm_s
make_tm(bitarr machine_bits) {
	struct tm_s me;

	me.machine_len = bitarray_length(machine_bits);
	me.machine_pos = 0;
	me.machine_bits = machine_bits;

	return me;
}

static void
machine_advance(tm *me, size_t by) {
	me->machine_pos = ((me->machine_pos) + by) % (me->machine_len);
}

static bit
machine_read(tm *me) {
	return bitarray_at(me->machine_bits, me->machine_pos);
}

