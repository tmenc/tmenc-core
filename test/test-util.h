
#include <stdio.h>
#include <assert.h>
#include <stdint.h>

void test_rng() {
	uint32_t x = 200;
	size_t i = 0;

	for (i = 0; i < 100; i++) {
		x = simple_rng(x);
		printf("%u\n", (unsigned int)simple_rng_to1bit(x));
	}
}

struct weak_rng_stream_closure {
	uint32_t seed;
};

static opaque
weak_rng_stream_generator(void *state, bit *finished_q) {
	struct weak_rng_stream_closure *ctx = state;
	opaque ret;

	ctx->seed = simple_rng(ctx->seed);
	ret.binary = simple_rng_to1bit(ctx->seed);
	return ret;
}

static stream
weak_rng_stream(uint32_t seed) {
	struct weak_rng_stream_closure *ctx;
	stream ret;

	ctx = dynalloc(sizeof(struct weak_rng_stream_closure));
	ctx->seed = seed;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = weak_rng_stream_generator;

	return ret;
}

static bitarr
generate_n_weak_random_bits(uint32_t seed, size_t size) {
	bitarr ret = bitarray_alloc(size);
	stream weak_rng;
	size_t i;
	bit b;

	weak_rng = weak_rng_stream(seed);

	for (i = 0; i < size; i++) {
		b = stream_read(&weak_rng).binary;
		bitarray_set_bit(ret, i, b);
	}

	maybe_free(weak_rng.state);

	return ret;
}

static void
assert_byte_vector_equal(vector v1, vector v2)
{
	size_t i;

	assert(v1.size == v2.size);
	for (i = 0; i < v1.size; i++) {
		assert(((v1.buffer[i].byte) == (v2.buffer[i].byte)));
	}
}

static void
assert_bitarray_equal(bitarr v1, bitarr v2)
{
	size_t i;

	assert(v1.bit_size == v2.bit_size);
	for (i = 0; i < v1.bit_size; i++) {
		assert(((bitarray_at(v1, i)) == (bitarray_at(v2, i))));
	}
}

void bitarray_zero_out(bitarr arr) {
	size_t i;

	for (i = 0; i < bit_length_to_byte_length(arr.bit_size); i++) {
		arr.buffer[i] = 0;
	}
}

void bitarray_print(bitarr arr) {
	size_t i;

	printf("bitarr bytes: [ ");
	for (i = 0; i < bit_length_to_byte_length(arr.bit_size); i++) {
		printf("%d ", arr.buffer[i]);
	}

	printf("]; bits: [ ");
	for (i = 0; i < arr.bit_size; i++) {
		printf("%d ", bitarray_at(arr, i));
	}
	printf("]\n");
}

#define TEST_BIT_OPS_LEN 10

void test_bit_ops() {
	size_t i;
	bitarr arr = bitarray_alloc(TEST_BIT_OPS_LEN);
	bit answers[TEST_BIT_OPS_LEN];

	assert(TEST_BIT_OPS_LEN == bitarray_length(arr));

	bitarray_zero_out(arr);
	for (i = 0; i < TEST_BIT_OPS_LEN; i++) {
		answers[i] = 0;
	}
	bitarray_print(arr);

	bitarray_set_bit(arr, 0, 1);
	answers[0] = 1;
	bitarray_print(arr);

	bitarray_set_bit(arr, 1, 1);
	answers[1] = 1;
	bitarray_print(arr);

	bitarray_set_bit(arr, 2, 1);
	answers[2] = 1;
	bitarray_print(arr);

	bitarray_set_bit(arr, 7, 1);
	answers[7] = 1;
	bitarray_print(arr);

	bitarray_set_bit(arr, 9, 1);
	answers[9] = 1;
	bitarray_print(arr);

	for (i = 0; i < TEST_BIT_OPS_LEN; i++) {
		/* printf("answers[%ld] == %d; bitarray_at(arr, %ld) == %d\n", i, (int)answers[i], i, (int)bitarray_at(arr, i)); */
		assert(answers[i] == bitarray_at(arr, i));
	}
}

void print_vector_of_sizes(vector v) {
	size_t i;

	printf("vec: [ ");
	for (i = 0; i < v.size; i++) {
		printf("%lu ", (unsigned long)v.buffer[i].size);
	}
	printf("]\n");
}

void print_vector_of_bytes(vector v) {
	size_t i;

	printf("vec: [ ");
	for (i = 0; i < v.size; i++) {
		printf("%lu ", (unsigned long)v.buffer[i].byte);
	}
	printf("]\n");
}

void test_range_stream() {
	stream s = range_stream(20);
	vector v = stream_to_vector(&s);
	stream y;
	bitarr b;

	print_vector_of_sizes(v);

	y = range_stream(10);
	b = binary_stream_to_bitarr(&y);

	bitarray_print(b);
}

void test_append_streams() {
	stream s1 = range_stream(20);
	stream s2 = range_stream(10);
	stream s3 = range_stream(5);
	stream *vec[3];
	stream app;
	vector v;

	vec[0] = &s1;
	vec[1] = &s2;
	vec[2] = &s3;

	app = append_streams(3, vec);

	v = stream_to_vector(&app);

	print_vector_of_sizes(v);
}

void test_integer_to_binary_stream() {
	size_t x = 100;
	size_t base = 8;
	stream s = integer_to_binary_stream(base, x);
	bitarr a = binary_stream_to_bitarr(&s);

	bitarray_print(a);
}

void test_byte_stream_to_binary_stream() {
	vector v = vector_create_empty();
	stream vs;
	stream bs;
	bitarr a;
	opaque o;

	/* Hello world:
	   72 101 108 108 111 32     119 111 114 108 100 */

	o.byte = 72;
	vector_push(&v, o);

	o.byte = 101;
	vector_push(&v, o);

	o.byte = 108;
	vector_push(&v, o);

	o.byte = 108;
	vector_push(&v, o);

	o.byte = 111;
	vector_push(&v, o);

	o.byte = 0;
	vector_push(&v, o);
	o.size = 255;
	vector_push(&v, o);

	print_vector_of_bytes(v);

	vs = vector_to_stream(&v);
	bs = byte_stream_to_binary_stream(&vs);
	a = binary_stream_to_bitarr(&bs);

	bitarray_print(a);
}


void test_binary_stream_to_byte_stream() {
	vector v = vector_create_empty();
	vector v2;
	stream vs;
	stream bs;
	stream bs2;
	stream vs2;
	bitarr a;
	opaque o;

	/* Hello world:
	   72 101 108 108 111 32     119 111 114 108 100 */

	o.byte = 72;
	vector_push(&v, o);

	o.byte = 101;
	vector_push(&v, o);

	o.byte = 108;
	vector_push(&v, o);

	o.byte = 108;
	vector_push(&v, o);

	o.byte = 111;
	vector_push(&v, o);

	o.byte = 0;
	vector_push(&v, o);
	o.size = 255;
	vector_push(&v, o);

	print_vector_of_bytes(v);

	vs = vector_to_stream(&v);
	bs = byte_stream_to_binary_stream(&vs);
	a = binary_stream_to_bitarr(&bs);

	bitarray_print(a);

	bs2 = bitarr_to_stream(&a);
	vs2 = binary_stream_to_byte_stream(&bs2);
	v2 = stream_to_vector(&vs2);

	print_vector_of_bytes(v2);

	assert_byte_vector_equal(v, v2);
}

static stream
make_default_tm_env(bitarr machine_bits, bitarr input_bits) {
	stream *s = dynalloc(sizeof(stream));
	*s = bitarr_to_cycle_stream(input_bits);
	return make_tm_env(machine_bits, s);
}

struct make_random_tm_env_ret {
	bitarr machine_bits;
	bitarr input_bits;
	stream tm_stream;
};

static struct make_random_tm_env_ret
make_random_tm_env(uint32_t seed, size_t input_size, size_t machine_size) {
	struct make_random_tm_env_ret ret;

	ret.machine_bits = generate_n_weak_random_bits(seed, machine_size);
	ret.input_bits = generate_n_weak_random_bits(seed + 1, input_size);
	ret.tm_stream = make_default_tm_env(ret.machine_bits, ret.input_bits);

	return ret;
}

static void
generate_example_key() {
	size_t machine_size   =      1000;
	size_t input_size     =      1000;
	size_t wr_tape_size   =   5000000;
	size_t wrap_count     =         0;
	size_t in_wrap_count  =       100;
	struct make_random_tm_env_ret env;
	size_t i;
	bit x;

	env = make_random_tm_env(777, input_size, machine_size);
	tm_stream_skip(&env.tm_stream, in_wrap_count, input_size, wrap_count, wr_tape_size);

	for (i = 0; i < wr_tape_size; i++) {
		x = stream_read(&env.tm_stream).binary;
		printf("%d\n", (int)x);
	}
}

static void
generate_example_binary_key() {
	size_t machine_size   =      1000;
	size_t input_size     =      1000;
	size_t wr_tape_size   = 500000000;
	size_t wrap_count     =         0;
	size_t in_wrap_count  =       100;
	struct make_random_tm_env_ret env;
	stream byte_out;
	size_t i;
	size_t to = wr_tape_size / (BITS_IN_SIZEOF * sizeof(byte_t));
	byte_t x;

	env = make_random_tm_env(777, input_size, machine_size);
	tm_stream_skip(&env.tm_stream, in_wrap_count, input_size, wrap_count, wr_tape_size);

	byte_out = binary_stream_to_byte_stream(&env.tm_stream);

	for (i = 0; i < to; i++) {
		x = stream_read(&byte_out).byte;
		putc(x, stdout);
	}
}

static void
generate_entropy_estimator() {
	size_t machine_size   =      1000;
	size_t input_size     =      1000;
	size_t wr_tape_size   = 400000000;
	size_t wrap_count     =         0;
	size_t in_wrap_count  =       100;
	struct make_random_tm_env_ret env;
	size_t i;
	size_t to = wr_tape_size / (BITS_IN_SIZEOF * sizeof(byte_t));
	byte_t x;

	int cur = 0;
	int max = 0;
	int abs = 0;

	env = make_random_tm_env(777, input_size, machine_size);
	tm_stream_skip(&env.tm_stream, in_wrap_count, input_size, wrap_count, wr_tape_size);

	for (i = 0; i < to; i++) {
		x = stream_read(&env.tm_stream).binary;
		if (x == 0) {
			cur--;
		} else {
			cur++;
		}

		if (cur < 0) {
			abs = -cur;
		} else {
			abs = cur;
		}

		if (abs > max) {
			max = abs;
			printf("{ %d, %lu }\n", max, (unsigned long)i);
		}
	}
}

static void
test_make_key()
{
	bitarr pass_v;
	bitarr salt_v;
	char *filepath;
	size_t size;
	size_t machine_size;
	size_t input_wrap_count;
	size_t wrap_count;
	bitarr key;
	bitarr correct_v;
	size_t i;

	pass_v = bitarray_alloc(8);
	i = 0;
	bitarray_set_bit(pass_v, i++, 1);
	bitarray_set_bit(pass_v, i++, 0);
	bitarray_set_bit(pass_v, i++, 0);
	bitarray_set_bit(pass_v, i++, 1);
	bitarray_set_bit(pass_v, i++, 1);
	bitarray_set_bit(pass_v, i++, 0);
	bitarray_set_bit(pass_v, i++, 1);
	bitarray_set_bit(pass_v, i++, 1);
	salt_v = bitarray_alloc(8);
	i = 0;
	bitarray_set_bit(salt_v, i++, 1);
	bitarray_set_bit(salt_v, i++, 1);
	bitarray_set_bit(salt_v, i++, 0);
	bitarray_set_bit(salt_v, i++, 1);
	bitarray_set_bit(salt_v, i++, 0);
	bitarray_set_bit(salt_v, i++, 1);
	bitarray_set_bit(salt_v, i++, 1);
	bitarray_set_bit(salt_v, i++, 0);

	filepath = "LICENSE";
	size = 12;
	machine_size = 23;
	input_wrap_count = 11;
	wrap_count = 17;

	key = make_key(&pass_v, &salt_v, filepath, size, machine_size, input_wrap_count, wrap_count);

	correct_v = bitarray_alloc(12);
	i = 0;
	bitarray_set_bit(correct_v, i++, 0);
	bitarray_set_bit(correct_v, i++, 0);
	bitarray_set_bit(correct_v, i++, 0);
	bitarray_set_bit(correct_v, i++, 1);
	bitarray_set_bit(correct_v, i++, 0);
	bitarray_set_bit(correct_v, i++, 1);
	bitarray_set_bit(correct_v, i++, 1);
	bitarray_set_bit(correct_v, i++, 0);
	bitarray_set_bit(correct_v, i++, 0);
	bitarray_set_bit(correct_v, i++, 0);
	bitarray_set_bit(correct_v, i++, 1);
	bitarray_set_bit(correct_v, i++, 1);

	bitarray_print(key);
	bitarray_print(correct_v);
	assert_bitarray_equal(correct_v, key);
}

