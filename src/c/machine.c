
#define DEBUG

#include <stdio.h>
#include <stdlib.h>

typedef unsigned long largeint_t; /* NOTE: "long long" is not in c89 */

typedef unsigned char bit;
typedef unsigned char bit_container;
#define BITS_IN_SIZEOF 8
#define CONTAINER_BITS (BITS_IN_SIZEOF * (sizeof(bit_container)))

struct bitarr_s {
	bit_container *buffer;
	largeint_t bit_size;
};
typedef struct bitarr_s bitarr;

static bit
nth_bit(bit_container x, int n) {
	return (x >> n) & 1;
}

static largeint_t
bitarray_length(bitarr arr) {
	return arr.bit_size;
}

static bit
bitarray_at(bitarr arr, largeint_t at) {
	largeint_t byte_pos = at / CONTAINER_BITS;
	int byte_shift = at % CONTAINER_BITS;

#ifdef DEBUG
	if (at >= arr.bit_size) {
		printf("OUT OF BOUNDS: %lu ; BIT_SIZE = %lu\n", at, arr.bit_size);
	}
#endif

	return (nth_bit(arr.buffer[byte_pos], byte_shift));
}

static void
bitarray_set_bit(bitarr arr, largeint_t at, bit value) {
	largeint_t bi = at / CONTAINER_BITS;
	int offset = at % CONTAINER_BITS;
	bit_container b;
	bit_container a;
	bit_container x;
	bit_container y;

#ifdef DEBUG
	if (at >= arr.bit_size) {
		printf("OUT OF BOUNDS: %lu ; BIT_SIZE = %lu\n", at, arr.bit_size);
	}
#endif

	b = arr.buffer[bi];
	a = ((bit_container) value) << offset;
	x = ((bit_container) 1) << offset;
	y = b ^ ((b & x) ^ (a & x));
	arr.buffer[bi] = y;
}

static largeint_t
bitarray_byte_length(bitarr arr) {
	return (1 + (arr.bit_size / (BITS_IN_SIZEOF * (sizeof(bit_container)))));
}

static bitarr
bitarray_alloc(largeint_t bit_size) {
	bitarr ret;
	largeint_t size;

	ret.bit_size = bit_size;
	size = bitarray_byte_length(ret);
	ret.buffer = malloc(size);
	if (ret.buffer == NULL) {
		printf("COULD NOT ALLOCATE BUFFER OF SIZE %lu", size);
	}

	return ret;
}
