
#include <stdio.h>
#include <stdint.h>

typedef unsigned long largeint_t;

struct bitarr_s {
	uint8_t *buffer;
	largeint_t size;
};
typedef struct bitarr_s bitarr;

uint8_t bitn(uint8_t x, int n) {
	return (x >> n) & 1;
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
	largeint_t i = 0;

	for (i = 0; i < 100; i++) {
		x = simple(x);
		printf("%u\n", to1bit(x));
	}

	return 0;
}

