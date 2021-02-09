#include <stdio.h>  /* getc, putc, fprintf */
#include <string.h>

/* 0 - unknown
 * 1 - encrypt
 * 2 - decrypt */
int mode = 0;

static struct buffer
read_file(char *path) {
	int size;
	char *buf;
	FILE *fp = fopen(path, "rb");
	struct buffer ret;

	fseek(fp, 0, SEEK_END);
	size = ftell(fp);
	fseek(fp, 0, SEEK_SET);

	buf = dynalloc(size);
	if (buf == NULL) {
		fprintf(stderr, "Could not allocate enough memory\n");
		fail();
	}

	if ((int)fread(buf, sizeof(*buf), size, fp) < size) {
		fprintf(stderr, "Failed on file read\n");
		fail();
	}

	ret.memory = buf;
	ret.size = size;
	return ret;
}

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
handle_file_buffer(bit encryptQ, char *pass_s, bitarr salt, struct buffer keyfile_buffer, int machine_size, int input_wrap_count, int wrap_count, bitarr input_file_bitarr, char *output_file) {
	bitarr pass = binary_stream_to_bitarr(hex_to_binary_stream(pass_s));
	int key_size = bitarray_length(input_file_bitarr);

	bitarr key = make_key_from_parameters(&pass, &salt, keyfile_buffer, machine_size, input_wrap_count, wrap_count, key_size);
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
	stream *salt_binary_stream = dynalloc(sizeof(stream));
	bitarr salt_a;
	stream *input_file_byte_stream = dynalloc(sizeof(stream));
	stream *input_file_stream = dynalloc(sizeof(stream));
	bitarr *input_file_bitarr = dynalloc(sizeof(bitarr));
	int machine_size_int;
	int input_wrap_count_int;
	int wrap_count_int;

	ask_user("pass", pass, sizeof(pass));
	ask_user("salt", salt, sizeof(salt));
	ask_user("keyfile", keyfile, sizeof(keyfile));
	ask_user("machine_size", machine_size, sizeof(machine_size));
	ask_user("input_wrap_count", input_wrap_count, sizeof(input_wrap_count));
	ask_user("wrap_count", wrap_count, sizeof(wrap_count));
	ask_user("input_file", input_file, sizeof(input_file));
	ask_user("output_file", output_file, sizeof(output_file));

	keyfile_buffer = read_file(keyfile);
	input_file_buffer = read_file(input_file); /* TODO: don't store input file in memoery */
	*salt_binary_stream = hex_to_binary_stream(salt);
	salt_a = binary_stream_to_bitarr(salt_binary_stream);
	*input_file_byte_stream = buffer_to_byte_stream(&input_file_buffer);
	*input_file_stream = byte_stream_to_binary_stream(input_file_byte_stream);
	*input_file_bitarr = binary_stream_to_bitarr(input_file_stream);
	machine_size_int = parse_u16_orfail(machine_size);
	input_wrap_count_int = parse_u16_orfail(input_wrap_count);
	wrap_count_int = parse_u16_orfail(wrap_count);

	(void)keyfile_buffer;
	(void)input_file_buffer;
	(void)salt_s;
	(void)machine_size_int;
	(void)input_wrap_count_int;

	exit(1);
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

