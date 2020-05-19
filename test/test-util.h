
#include <stdio.h>
#include <assert.h>
#include <stdint.h>

uint32_t simple_rng(uint32_t x) {
	uint32_t a = 1664525;
	uint32_t b = 1013904223;
	return x * a + b;
}

uint32_t simple_rng_to1bit(uint32_t x) {
	if (x > 2147483648UL) { return 1; }
	else { return 0; }
}

void test_rng() {
	uint32_t x = 200;
	size_t i = 0;

	for (i = 0; i < 100; i++) {
		x = simple_rng(x);
		printf("%u\n", simple_rng_to1bit(x));
	}
}

void assert_byte_vector_equal(vector v1, vector v2) {
	size_t i;

	assert(v1.size == v2.size);
	for (i = 0; i < v1.size; i++) {
		assert(((v1.buffer[i].byte) == (v2.buffer[i].byte)));
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
}

