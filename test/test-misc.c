
int main() {
	printf("start test-misc.c\n");

	test_bit_ops();
	test_range_stream();
	test_append_streams();
	test_integer_to_binary_stream();
	test_byte_stream_to_binary_stream();
	test_binary_stream_to_byte_stream();
	test_basic_out();
	test_make_key();
	test_normalize_text();

	printf("all passed");
	return 0;
}
