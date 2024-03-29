#include <stdio.h>  /* getc, putc, fprintf */

/* 0 - unknown
 * 1 - encrypt
 * 2 - decrypt */
int mode = 0;

static int
read_line(char *input, int input_size) {
	int i;
	int c;

	for (i = 0; i < input_size; i++) {
		c = getc(stdin);
		if (c == EOF || c == '\n' || c == '\0') {
			input[i] = 0;
			return 0;
		}

		input[i] = c;
	}

	return 1;
}

static void
ask_user(char *what, char *where, int where_size) {
	fprintf(stderr, "%s: ", what);
	if (read_line(where, where_size)) {
		fprintf(stderr, "bad string. maximum size is: %d\n", where_size - 1);
		fail();
	}
}

static void
handle_file_buffer(bit encryptQ, char *pass_s, bitarr salt, struct buffer keyfile_buffer0, int input_wrap_count, int wrap_count, bitarr input_file_bitarr, FILE *output_file) {
	struct buffer pass_buf0 = buffer_from_string(pass_s);
	struct buffer *pass_buf = normalize_text_buffer(&pass_buf0);
	stream pass_stream = buffer_to_binary_stream(pass_buf);
	bitarr pass = binary_stream_to_bitarr(&pass_stream);
	int key_size = bitarray_length(input_file_bitarr);
	struct buffer *keyfile_buffer = normalize_text_buffer(&keyfile_buffer0);

	bitarr key = make_key(pass, salt, *keyfile_buffer, key_size, input_wrap_count, wrap_count);
	stream xored_stream = xor_with_key(key, input_file_bitarr);

	if (encryptQ) {
		stream salt_stream = bitarr_to_stream(salt);
		size_t salt_len = bitarray_length(salt);
		stream salt_len_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, salt_len);
		stream key_size_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, key_size);
		stream input_wrap_count_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, input_wrap_count);
		stream wrap_count_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, wrap_count);

		stream *combination[20];
		int i = 0;
		combination[i++] = &salt_len_stream;
		combination[i++] = &salt_stream;
		combination[i++] = &input_wrap_count_stream;
		combination[i++] = &wrap_count_stream;
		combination[i++] = &key_size_stream;
		combination[i++] = &xored_stream;
		{
			stream binary_stream = append_streams(i, combination);
			stream padded_stream = pad_stream(BLOCK_LEN, &binary_stream);
			stream byte_stream = binary_stream_to_byte_stream(&padded_stream);

			byte_stream_dump_to_file(&byte_stream, output_file);
			fclose(output_file);
		}
	} else {
		stream byte_stream = binary_stream_to_byte_stream(&xored_stream);

		byte_stream_dump_to_file(&byte_stream, output_file);
		fclose(output_file);
	}
}

static void
decrypt_file(void) {
	char pass[512];
	char keyfile[512];
	char input_file[512];
	char output_file[512];

	struct buffer keyfile_buffer;
	struct buffer input_file_buffer;
	int salt_len;
	bitarr salt_a;
	stream input_file_byte_stream;
	stream input_file_stream;
	int input_wrap_count_int;
	int wrap_count_int;
	FILE *ofp;
	int xored_len;
	bitarr xored_bitarr;

	ask_user("pass", pass, sizeof(pass));
	ask_user("keyfile", keyfile, sizeof(keyfile));
	ask_user("input_file", input_file, sizeof(input_file));
	ask_user("output_file", output_file, sizeof(output_file));

	ofp = open_file(output_file, "w");

	keyfile_buffer = read_optional_file(keyfile);
	input_file_buffer = read_file(input_file); /* TODO: don't store input file in memoery */
	input_file_byte_stream = buffer_to_byte_stream(&input_file_buffer);
	input_file_stream = byte_stream_to_binary_stream(&input_file_byte_stream);
	salt_len = binary_stream_read_integer(SIZE_BLOCK_LEN, &input_file_stream);
	salt_a = stream_read_n_bitarr(salt_len, &input_file_stream);
	input_wrap_count_int = binary_stream_read_integer(SIZE_BLOCK_LEN, &input_file_stream);
	wrap_count_int = binary_stream_read_integer(SIZE_BLOCK_LEN, &input_file_stream);
	xored_len = binary_stream_read_integer(SIZE_BLOCK_LEN, &input_file_stream);
	xored_bitarr = stream_read_n_bitarr(xored_len, &input_file_stream);

	handle_file_buffer(0, pass, salt_a, keyfile_buffer, input_wrap_count_int, wrap_count_int, xored_bitarr, ofp);
}

static void
encrypt_file(void) {
	char pass[512];
	char salt[8192];
	char keyfile[512];
	char input_wrap_count[32];
	char wrap_count[32];
	char input_file[512];
	char output_file[512];

	struct buffer keyfile_buffer;
	struct buffer input_file_buffer;
	stream salt_binary_stream;
	bitarr salt_a;
	stream input_file_byte_stream;
	stream input_file_stream;
	bitarr input_file_bitarr;
	int input_wrap_count_int;
	int wrap_count_int;
	FILE *ofp;

	ask_user("pass", pass, sizeof(pass));
	ask_user("salt", salt, sizeof(salt));
	ask_user("keyfile", keyfile, sizeof(keyfile));
	ask_user("input_wrap_count", input_wrap_count, sizeof(input_wrap_count));
	ask_user("wrap_count", wrap_count, sizeof(wrap_count));
	ask_user("input_file", input_file, sizeof(input_file));
	ask_user("output_file", output_file, sizeof(output_file));

	ofp = open_file(output_file, "w");

	keyfile_buffer = read_optional_file(keyfile);
	input_file_buffer = read_file(input_file); /* TODO: don't store input file in memoery */
	salt_binary_stream = hex_to_binary_stream(salt);
	salt_a = binary_stream_to_bitarr(&salt_binary_stream);
	input_file_byte_stream = buffer_to_byte_stream(&input_file_buffer);
	input_file_stream = byte_stream_to_binary_stream(&input_file_byte_stream);
	input_file_bitarr = binary_stream_to_bitarr(&input_file_stream);
	input_wrap_count_int = parse_u16_orfail(input_wrap_count);
	wrap_count_int = parse_u16_orfail(wrap_count);

	handle_file_buffer(1, pass, salt_a, keyfile_buffer, input_wrap_count_int, wrap_count_int, input_file_bitarr, ofp);
}

static void
get_file_info(void) {
	char input_file[512];

	struct buffer input_file_buffer;
	int salt_len;
	bitarr salt_a;
	stream input_file_byte_stream;
	stream input_file_stream;
	int input_wrap_count_int;
	int wrap_count_int;
	int xored_len;

	ask_user("input_file", input_file, sizeof(input_file));

	input_file_buffer = read_file(input_file); /* TODO: don't store input file in memoery */
	input_file_byte_stream = buffer_to_byte_stream(&input_file_buffer);
	input_file_stream = byte_stream_to_binary_stream(&input_file_byte_stream);
	salt_len = binary_stream_read_integer(SIZE_BLOCK_LEN, &input_file_stream);
	salt_a = stream_read_n_bitarr(salt_len, &input_file_stream);
	input_wrap_count_int = binary_stream_read_integer(SIZE_BLOCK_LEN, &input_file_stream);
	wrap_count_int = binary_stream_read_integer(SIZE_BLOCK_LEN, &input_file_stream);
	xored_len = binary_stream_read_integer(SIZE_BLOCK_LEN, &input_file_stream);

	/* TODO: fprintf(stdout, "SALT=%s", salt_a); */ (void)salt_a;
	fprintf(stdout, "INPUT_WRAP_COUNT= %d\n", input_wrap_count_int);
	fprintf(stdout, "WRAP_COUNT= %d\n", wrap_count_int);
	fprintf(stdout, "XORED_LEN= %d\n", xored_len);
}

static void
set_mode(void) {
	char answer[20];
	ask_user("entrypt/decrypt/get_file_info", answer, sizeof(answer));

	if (string_equal_p(answer, "encrypt")) {
		mode = 1;
	} else if (string_equal_p(answer, "decrypt")) {
		mode = 2;
	} else if (string_equal_p(answer, "get_file_info")) {
		mode = 3;
	} else {
		fprintf(stderr, "Expected encrypt or decrypt, got %s\n", answer);
		fail();
	}
}

static void
entry(void) {
	set_mode();
	if (mode == 1) {
		encrypt_file();
	} else if (mode == 2) {
		decrypt_file();
	} else if (mode == 3) {
		get_file_info();
	}
}

int
main(int argc, char **argv) {
	entry();
	return 0;
}

