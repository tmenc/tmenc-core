
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

