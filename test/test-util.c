
#include <stdio.h>
#include <assert.h>

uint32_t simple_rng(uint32_t x) {
	uint32_t a = 1664525;
	uint32_t b = 1013904223;
	return x * a + b;
}

uint32_t simple_rng_to1bit(uint32_t x) {
	if (x > 2147483648) { return 1; }
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

void bitarr_zero_out(bitarr arr) {
	size_t i;

	for (i = 0; i < (arr.bit_size / 8) + 1; i++) {
		arr.buffer[i] = 0;
	}
}

void bitarr_print(bitarr arr) {
	size_t i;

	printf("bitarr bytes: [ ");
	for (i = 0; i < BITARR_BYTE_SIZE(arr.bit_size); i++) {
		printf("%d ", arr.buffer[i]);
	}

	printf("; bits: [");
	for (i = 0; i < arr.bit_size; i++) {
		printf("%d ", bitarray_at(arr, i);
	}
	printf("\n");
}

void test_bit_ops() {
	bitarr arr = bitarr_alloc(10);

	bitarr_print(arr);
}

