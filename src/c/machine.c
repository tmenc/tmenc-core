
#include <stdio.h>
#include <stdint.h>

#define DEBUG

typedef unsigned long largeint_t;

typedef uint8_t bit;
typedef uint8_t bit_container;

#define true ((bit)1)
#define false ((bit)0)

struct bitarr_s {
	bit_container *buffer;
	size_t bit_size;
};
typedef struct bitarr_s bitarr;

bit nth_bit(bit_container x, int n) {
	return (x >> n) & 1;
}

/* NOTE: doesn't check for size! */
bit bitarr_at(bitarr arr, size_t at) {
	size_t byte_pos = at / sizeof(bit_container);
	int byte_shift = at % sizeof(bit_container);

#ifdef DEBUG
	printf("OUT OF BOUNDS: %lu ; BIT_SIZE = %lu\n", at, arr.bit_size);
#endif

	return (nth_bit(arr.buffer[byte_pos], byte_shift));
}

bitarr_set_bit

bitarr_s bitarr_alloc(size_t bit_size) {
	bitarr_s ret;
	size_t size;

	size = (1 * (sizeof(bit_container)))
		+ (bit_size / (sizeof(bit_container)));

	ret.bit_size = bit_size;
	ret.buffer = malloc(size);
	if (ret.buffer == NULL) {
		printf("COULD NOT ALLOCATE BUFFER OF SIZE %lu", size);
	}

	return ret;
}

uint32_t simple(uint32_t x) {
	uint32_t a = 1664525;
	uint32_t b = 1013904223;
	return x * a + b;
}

uint32_t to1bit(uint32_t x) {
	if (x > 2147483648) { return 1; }
	else { return 0; }
}

int main() {
	uint32_t x = 200;
	size_t i = 0;

	for (i = 0; i < 100; i++) {
		x = simple(x);
		printf("%u\n", to1bit(x));
	}

	return 0;
}

