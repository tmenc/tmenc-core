
#include <stdio.h>
#include <string.h>

#define BUFFER_LEN 512

/* 0 - unknown
 * 1 - encrypt
 * 2 - decrypt */
int mode = 0;

static
fail(void) {
	exit(1);
}

static
int string_equal_p(char *a, char *b) {
	return (strcmp(a, b) == 0);
}

static
void decrypt_file(void) {
	/* TODO */
}

static
void encrypt_file(void) {
	
}

static
void set_mode(void) {
	char answer[BUFFER_LEN];
	printf("entrypt/decrypt: ");
	fgets(answer, BUFFER_LEN, stdin);

	if (string_equal_p(answer, "encrypt")) {
		mode = 1;
	} else if (string_equal_p(answer, "decrypt")) {
		mode = 2;
	} else {
		fprintf(stderr, "Expected encrypt or decrypt, got %s\n", answer);
		fail();
	}
}

static
void entry(void) {
	set_mode();
	if (mode == 1) {
		encrypt_file();
	} else {
		decrypt_file();
	}
}

int main(int argc, char **argv) {
	entry();
	return 0;
}

