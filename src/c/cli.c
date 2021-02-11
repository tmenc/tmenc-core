#include <stdio.h>  /* getc, putc, fprintf */
#include <string.h>

/* 0 - unknown
 * 1 - encrypt
 * 2 - decrypt */
int mode = 0;

static void
ask_user(char *what, char *where, int where_size) {
	fprintf(stderr, "%s: ", what);
	if (read_line(where, where_size)) {
		fprintf(stderr, "Bad string. Maximum size is: %d\n", where_size - 1);
		fail();
	}
}

static int
string_equal_p(char *a, char *b) {
	return (strcmp(a, b) == 0);
}

static void
decrypt_file(void) {
	/* TODO */
}

static void
handle_file_buffer(bit encryptQ, char *pass_s, bitarr salt, struct buffer keyfile_buffer, int machine_size, int input_wrap_count, int wrap_count, bitarr input_file_bitarr, FILE *output_file) {
	stream pass_stream = hex_to_binary_stream(pass_s);
	bitarr pass = binary_stream_to_bitarr(&pass_stream);
	int key_size = bitarray_length(input_file_bitarr);

	bitarr key = make_key(&pass, &salt, keyfile_buffer, key_size, machine_size, input_wrap_count, wrap_count);
	stream xored_stream = xor_with_key(key, input_file_bitarr);

	printf("%d %d %d %d %d\n",
		bitarray_at(key, 0),
		bitarray_at(key, 1),
		bitarray_at(key, 2),
		bitarray_at(key, 3),
		bitarray_at(key, 4));

	(void)key;
	(void)xored_stream;

	if (encryptQ) {
		stream salt_stream = bitarr_to_stream(&salt);
		size_t salt_len = bitarray_length(salt);
		stream salt_len_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, salt_len);
		stream key_size_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, key_size);
		stream machine_size_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, machine_size);
		stream input_wrap_count_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, input_wrap_count);
		stream wrap_count_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, wrap_count);

		stream *combination[20];
		int i = 0;
		combination[i++] = &machine_size_stream;
		combination[i++] = &input_wrap_count_stream;
		combination[i++] = &wrap_count_stream;
		combination[i++] = &salt_len_stream;
		combination[i++] = &salt_stream;
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
		assert(0 && "TODO");
	}
}

static void
encrypt_file(void) {
	char pass[512];
	char salt[8192];
	char keyfile[512];
	char machine_size[32];
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
	int machine_size_int;
	int input_wrap_count_int;
	int wrap_count_int;
	FILE *ofp;

	ask_user("pass", pass, sizeof(pass));
	ask_user("salt", salt, sizeof(salt));
	ask_user("keyfile", keyfile, sizeof(keyfile));
	ask_user("machine_size", machine_size, sizeof(machine_size));
	ask_user("input_wrap_count", input_wrap_count, sizeof(input_wrap_count));
	ask_user("wrap_count", wrap_count, sizeof(wrap_count));
	ask_user("input_file", input_file, sizeof(input_file));
	ask_user("output_file", output_file, sizeof(output_file));

	ofp = fopen(output_file, "w");
	if (ofp == NULL) {
		fprintf(stderr, "Could not open output file\n");
		fail();
	}

	keyfile_buffer = read_file(keyfile);
	input_file_buffer = read_file(input_file); /* TODO: don't store input file in memoery */
	salt_binary_stream = hex_to_binary_stream(salt);
	salt_a = binary_stream_to_bitarr(&salt_binary_stream);
	input_file_byte_stream = buffer_to_byte_stream(&input_file_buffer);
	input_file_stream = byte_stream_to_binary_stream(&input_file_byte_stream);
	input_file_bitarr = binary_stream_to_bitarr(&input_file_stream);
	machine_size_int = parse_u16_orfail(machine_size);
	input_wrap_count_int = parse_u16_orfail(input_wrap_count);
	wrap_count_int = parse_u16_orfail(wrap_count);

	handle_file_buffer(1, pass, salt_a, keyfile_buffer, machine_size_int, input_wrap_count_int, wrap_count_int, input_file_bitarr, ofp);
}

static void
set_mode(void) {
	char answer[20];
	ask_user("entrypt/decrypt", answer, sizeof(answer));

	if (string_equal_p(answer, "encrypt")) {
		mode = 1;
	} else if (string_equal_p(answer, "decrypt")) {
		mode = 2;
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
	} else {
		decrypt_file();
	}
}

int
main(int argc, char **argv) {
	entry();
	return 0;
}

