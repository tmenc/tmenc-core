
#include <stdio.h>
#include <stdint.h>

typedef uint32_t itype;

itype simple(itype x) {
	itype a = 1664525;
	itype b = 1013904223;
	return x * a + b;
}

itype bitn(itype x, int n) {
	return (x >> n) & 1;
}

itype to1bit(itype x) {
	if (x > 2147483648) { return 1; }
	else { return 0; }
}

void main() {
	itype x = 200;

	for (int i = 0; i < 100; i++) {
		x = simple(x);
		printf("%u\n", to1bit(x));
	}
}

