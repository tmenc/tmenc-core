
int main() {
	bitarr arr = generate_n_weak_random_bits(224, 100000);
	size_t i;

	for (i = 0; i < arr.bit_size; i++) {
		printf("%d\n", (int)bitarray_at(arr, i));
	}

	return 0;
}

