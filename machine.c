
#include <stdio.h>
#include <stdint.h>

typedef uint32_t itype;

itype simple(itype x) {
	itype a = 1664525;
	itype b = 1013904223;
	return (x * a + b);
}

void main() {
	itype x = 200;

	for (int i = 0; i < 10; i++) {
		x = simple(x);
		printf("%u\n", x);
	}
}

