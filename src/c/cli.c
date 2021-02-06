
#include <stdio.h>
#include <string.h>

/* 0 - unknown
 * 1 - encrypt
 * 2 - decrypt */
int mode = 0;

static void
fail(void) {
	exit(1);
}

static char*
read_file(char *path) {
	int size;
	char *buf;
	FILE *fp = fopen(path, "rb");

	fseek(fp, 0, SEEK_END);
	size = ftell(fp);
	fseek(fp, 0, SEEK_SET);

	buf = malloc(size);
	if (buf == NULL) {
		fprintf(stderr, "Could not allocate enough memory\n");
		fail();
	}

	if ((int)fread(buf, sizeof(*buf), size, fp) < size) {
		fprintf(stderr, "Failed on file read\n");
		fail();
	}

	return buf;
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
encrypt_file(void) {
	char pass[512];
	char salt[8192];
	char keyfile[512];
	char machine_size[32];
	char input_wrap_count[32];
	char wrap_count[32];
	char input_file[512];
	char output_file[512];

	char *keyfile_buffer;
	char *input_file_buffer;
	char *salt;

	ask_user("pass", pass, sizeof(pass));
	ask_user("salt", salt, sizeof(salt));
	ask_user("keyfile", keyfile, sizeof(keyfile));
	ask_user("machine_size", machine_size, sizeof(machine_size));
	ask_user("input_wrap_count", input_wrap_count, sizeof(input_wrap_count));
	ask_user("wrap_count", wrap_count, sizeof(wrap_count));
	ask_user("input_file", input_file, sizeof(input_file));
	ask_user("output_file", output_file, sizeof(output_file));

	keyfile_buffer = read_file(keyfile);
	input_file_buffer = read_file(input_file);
	salt_s = binary_stream_to_bitarr(hex_to_binary_stream(salt));

	(void)keyfile_buffer;
	(void)input_file_buffer;

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

