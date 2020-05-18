
#define DEBUG

#include <stdio.h>
#include <stdint.h>
#include <stdlib.h>

typedef unsigned long largeint_t;

typedef uint8_t bit;
typedef uint8_t bit_container;

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
	size_t byte_pos = at / sizeof(bit_container);
	int byte_shift = at % sizeof(bit_container);

#ifdef DEBUG
	if (at >= arr.bit_size) {
		printf("OUT OF BOUNDS: %lu ; BIT_SIZE = %lu\n", at, arr.bit_size);
	}
#endif

	return (nth_bit(arr.buffer[byte_pos], byte_shift));
}

static void
bitarray_set_bit(bitarr arr, size_t at, bit value) {
	size_t bi = at / sizeof(bit_container);
	int offset = at % sizeof(bit_container);
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

#define BITARR_BYTE_SIZE(bit_size) (1 + (bit_size / (sizeof(bit_container))))

static bitarr
bitarray_alloc(size_t bit_size) {
	bitarr ret;
	size_t size;

	size = BITARR_BYTE_SIZE(bit_size);
	ret.bit_size = bit_size;
	ret.buffer = malloc(size);
	if (ret.buffer == NULL) {
		printf("COULD NOT ALLOCATE BUFFER OF SIZE %lu", size);
	}

	return ret;
}
