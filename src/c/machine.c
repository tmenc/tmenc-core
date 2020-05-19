
#define DEBUG

#include <stdio.h>
#include <stdlib.h>
#include <stddef.h> /* size_t */

/*********
 * TYPES *
 *********/

typedef unsigned char bit;
typedef unsigned char bit_container;
typedef unsigned char byte_t;
#define BITS_IN_SIZEOF 8
#define CONTAINER_BITS (BITS_IN_SIZEOF * (sizeof(bit_container)))

union opaque_u {
	bit binary;
	int integer;
	byte_t byte;
	size_t size;
	void *other;
};
typedef union opaque_u opaque;

/************
 * BITARRAY *
 ************/

struct bitarr_s {
	bit_container *buffer;
	size_t bit_size;
	size_t bit_capacity;
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
bit_length_to_byte_length(size_t bit_size) {
	return (1 + (bit_size / CONTAINER_BITS));
}

static bitarr
bitarray_alloc(size_t bit_size) {
	bitarr ret;
	size_t size;

	size = bit_length_to_byte_length(bit_size);
	ret.buffer = malloc(size);
	if (ret.buffer == NULL) {
		printf("COULD NOT ALLOCATE BUFFER OF SIZE %lu\n", (unsigned long)size);
	}
	ret.bit_capacity = size * CONTAINER_BITS;
	ret.bit_size = bit_size;

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
double_tape_move_left(double_tape *tape) {
	if (tape->me->left == NULL) {
		tape->me->left = double_tape_body_alloc(NULL, tape->me);
	}
	tape->me = tape->me->left;
}

static void
double_tape_move_right(double_tape *tape) {
	if (tape->me->right == NULL) {
		tape->me->right = double_tape_body_alloc(tape->me, NULL);
	}
	tape->me = tape->me->right;
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

typedef opaque (*stream_generator)(void*, bit*);

struct stream_s {
	void* state; /* like context */
	bit finished_q;
	stream_generator generator;
};
typedef struct stream_s stream;

static bit
stream_finished(stream *s) {
	return s->finished_q;
}

static opaque
stream_read(stream *s) {
	opaque ret;

	if (s->finished_q) {
		ret.other = NULL;
	} else {
		ret = s->generator(s->state, &(s->finished_q));
	}

	return ret;
}

/**********
 * TM ENV *
 **********/

struct tm_env_s {
	struct tm_s  tm;
	double_tape  memory_tape;
	stream      *input_stream;
};
typedef struct tm_env_s tm_env;

static opaque
tm_env_generator(void *state, bit *finished_q) {
	tm_env *env = state;
	opaque stream_ret;
	bit read_tape_bit;
	size_t memory_tape_register;
	tm_step ret;
	size_t new_register_value;

	while (1) {

		read_tape_bit = stream_read(env->input_stream).binary;
#ifdef DEBUG
		if (stream_finished(env->input_stream)) {
			printf("tm input_stream finished but it should never do that\n");
		}
#endif

		memory_tape_register = double_tape_get(env->memory_tape);

		ret = machine_step(&(env->tm), read_tape_bit, memory_tape_register);

		if (ret.increment_dir == 0 && memory_tape_register <= 0) {
			ret.increment_bit = 0;
		}

		if (ret.increment_dir == 0) {
			new_register_value = memory_tape_register - ret.increment_bit;
		} else {
			new_register_value = memory_tape_register + ret.increment_bit;
		}
		double_tape_set(env->memory_tape, new_register_value);

		if (ret.direction_bit == 0) {
			double_tape_move_left(&(env->memory_tape));
		} else {
			double_tape_move_right(&(env->memory_tape));
		}

		if (ret.wt_skip == 0) {
			stream_ret.binary = ret.wt_bit;
			return stream_ret;
		}
	}
}

static stream
make_tm_env(bitarr machine_bits, stream *input_stream) {
	tm_env *env;
	stream ret;

	env = malloc(sizeof(tm_env));
	env->tm = make_tm(machine_bits);
	env->memory_tape = double_tape_create();
	env->input_stream = input_stream;

	ret.state = env;
	ret.finished_q = 0;
	ret.generator = tm_env_generator;

	return ret;
}
