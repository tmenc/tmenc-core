#include <stdio.h>

int main(int argc, char **argv) {
	char passbuf[512];
	char filebuf[512];

	printf(">pass: ");
	scanf("%s", passbuf);

	printf(">file: ");
	scanf("%s", filebuf);

	printf("we got pass: '%s', file: '%s'\n", passbuf, filebuf);
	return 0;
}

