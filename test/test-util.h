
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

#define IS_BIG_ENDIAN (*(uint16_t *)"\0\xff" < 0x100)
#define IS_LITTLE_ENDIAN (!IS_BIG_ENDIAN)

void test_bit_ops() {
	size_t len = 10;
	bitarr arr = bitarray_alloc(len);

	if (IS_BIG_ENDIAN) {
		printf("ON BIG ENDIAN MACHINE\n");
	} else {
		printf("ON LITTLE ENDIAN MACHINE\n");
	}

	assert(len == bitarray_length(arr));

	bitarray_zero_out(arr);

	bitarray_print(arr);
#if IS_LITTLE_ENDIAN
	assert(arr.buffer[0] == 0 && arr.buffer[1] == 0);
#endif

	bitarray_set_bit(arr, 0, 1);
	bitarray_print(arr);
#if IS_LITTLE_ENDIAN
	assert(arr.buffer[0] == 1 && arr.buffer[1] == 0);
#endif

	bitarray_set_bit(arr, 1, 1);
	bitarray_print(arr);
#if IS_LITTLE_ENDIAN
	assert(arr.buffer[0] == 3 && arr.buffer[1] == 0);
#endif

	bitarray_set_bit(arr, 2, 1);
	bitarray_print(arr);
#if IS_LITTLE_ENDIAN
	assert(arr.buffer[0] == 7 && arr.buffer[1] == 0);
#endif

	bitarray_set_bit(arr, 7, 1);
	bitarray_print(arr);
#if IS_LITTLE_ENDIAN
	assert(arr.buffer[0] == 135 && arr.buffer[1] == 0);
#endif

	bitarray_set_bit(arr, 9, 1);
	bitarray_print(arr);
#if IS_LITTLE_ENDIAN
	assert(arr.buffer[0] == 135 && arr.buffer[1] == 2);
#endif
}
