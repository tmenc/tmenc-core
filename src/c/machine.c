
#define DEBUG

#include <stdio.h>
#include <stdlib.h>
#include <stddef.h> /* size_t */

typedef unsigned char bit;
typedef unsigned char bit_container;
#define BITS_IN_SIZEOF 8
#define CONTAINER_BITS (BITS_IN_SIZEOF * (sizeof(bit_container)))

/************
 * BITARRAY *
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
 * DOUBLE TAPE *
 ***************/

struct double_tape_body_s {
	struct double_tape_body_s *left;
	struct double_tape_body_s *right;
	size_t current;
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

static size_t
double_tape_get(double_tape tape) {
	return tape.me->current;
}

static void
double_tape_set(double_tape tape, size_t value) {
	tape.me->current = value;
}

/******
 * TM *
 ******/

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

static bit
machine_flip_and_read(tm *me) {
	bit new_bit = 1 ^ machine_read(me);
	bitarray_set_bit(me->machine_bits, me->machine_pos, new_bit);
	return new_bit;
}

struct tm_step_s {
	bit wt_bit;
	bit wt_skip;
	bit increment_bit;
	bit increment_dir;
	bit direction_bit;
};
typedef struct tm_step_s tm_step;

static tm_step
machine_step(tm *me, bit read_tape_bit, size_t memory_tape_register) {
	tm_step ret;
	size_t jump_size = (1 + ((size_t)read_tape_bit)) * (1 + memory_tape_register);

	ret.wt_skip = machine_flip_and_read(me);
	machine_advance(me, jump_size);
	ret.increment_bit = machine_flip_and_read(me);
	machine_advance(me, jump_size);
	ret.increment_dir = machine_flip_and_read(me);
	machine_advance(me, jump_size);
	ret.direction_bit = machine_flip_and_read(me);
	machine_advance(me, jump_size);

	return ret;
}

/**********
 * STREAM *
 **********/

union stream_return_type_u {
	bit binary;
	int integer;
	size_t size;
	void *other;
};
typedef union stream_return_type_u stream_return_type;

typedef stream_return_type (*stream_generator)(void*, bit*);

struct stream_s {
	void* state; /* like context */
	bit finished_q;
	stream_generator generator;
};
typedef struct stream_s stream;

struct range_stream_closure {
	size_t max;
	size_t current;
};

static stream_return_type
range_stream_generator(void *state, bit *finished_q) {
	stream_return_type ret;
	struct range_stream_closure *ctx = state;

	if (ctx->current == ctx->max) {
		*finished_q = 1;
		return NULL;
	}

	ret.size = ctx->current;
	ctx->current++;
	return ret;
}

static stream
range_stream(size_t n) {
	stream ret;
	struct range_stream_closure *ctx;

	ctx = malloc(sizeof(struct range_stream_closure));
	ctx->current = 0;
	ctx->max = n;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = range_stream_generator;
	return ret;
}

/**********
 * TM ENV *
 **********/

struct tm_env_s {
	struct tm_s tm;
	double_tape memory_tape;
	bitarr      read_tape;
	size_t      read_tape_len;
	size_t      read_tape_pos;
};


