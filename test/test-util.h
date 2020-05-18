
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

void bitarray_zero_out(bitarr arr) {
	size_t i;

	for (i = 0; i < (arr.bit_size / 8) + 1; i++) {
		arr.buffer[i] = 0;
	}
}

void bitarray_print(bitarr arr) {
	size_t i;

	printf("bitarr bytes: [ ");
	for (i = 0; i < bitarray_byte_length(arr); i++) {
		printf("%d ", arr.buffer[i]);
	}

	printf("]; bits: [");
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

	bitarray_zero_out(arr);
	for (i = 0; i < TEST_BIT_OPS_LEN; i++) {
		assert(answers[i] == bitarray_at(arr, i));
	}
}

