#include <stdio.h>  /* fprintf, fopen */

/****************
 * SIZED BUFFER *
 ****************/

struct buffer {
	char *memory;
	size_t size;
};

/********************
 * BITARR AS VECTOR *
 ********************/

static bitarr
bitarray_create_empty() {
	bitarr ret = bitarray_alloc(1024);
	ret.bit_size = 0;
	return ret;
}

static void
bitarray_push(bitarr *arr, bit o) {
	size_t size;
	size_t new_bit_size;

	if ((arr->bit_size) >= (arr->bit_capacity)) {
		new_bit_size = ((arr->bit_capacity) + 1) * 2;
		size = bit_length_to_byte_length(new_bit_size);
		arr->buffer = realloc(arr->buffer, size);
#ifdef DEBUG
		if (arr->buffer == NULL) {
			fprintf(stderr, "COULD NOT GROW VECTOR TO SIZE %lu\n", (unsigned long)size);
		}
#endif
		arr->bit_capacity = size * CONTAINER_BITS;
	}

	arr->bit_size++;
	bitarray_set_bit(*arr, arr->bit_size - 1, o);
}

static void
bitarray_maybe_free(bitarr *arr) {
	maybe_free(arr->buffer);
	arr->buffer = NULL;
	arr->bit_capacity = 0;
	arr->bit_size = 0;
}

/**********
 * VECTOR *
 **********/

struct vector_s {
	opaque *buffer;
	size_t size;
	size_t capacity;
};
typedef struct vector_s vector;

static vector
vector_create_alloced(int size) {
	vector ret;
	ret.size = 0;
	ret.capacity = size;
	ret.buffer = dynalloc((ret.capacity) * sizeof(opaque));
#ifdef DEBUG
	if (ret.buffer == NULL) {
		fprintf(stderr, "COULD NOT ALLOCATE EMPTY VECTOR\n");
	}
#endif
	return ret;
}

static vector
vector_create_empty() {
	return vector_create_alloced(128);
}

static size_t
vector_length(vector vec) {
	return vec.size;
}

static void
vector_push(vector *vec, opaque object) {
	if ((vec->size) >= (vec->capacity)) {
		vec->capacity = (vec->capacity + 1) * 2;
		vec->buffer = realloc(vec->buffer, (vec->capacity) * (sizeof(opaque)));
#ifdef DEBUG
		if (vec->buffer == NULL) {
			fprintf(stderr, "COULD NOT GROW VECTOR TO SIZE %lu\n", (unsigned long)(vec->capacity));
		}
#endif
	}
	vec->buffer[vec->size] = object;
	vec->size++;
}

static void
vector_maybe_free(vector *vec) {
	maybe_free(vec->buffer);
	vec->buffer = NULL;
	vec->capacity = 0;
	vec->size = 0;
}

static vector
buffer_to_vector(struct buffer buf) {
	opaque *obuf;
	vector ret;
	size_t size = buf.size;
	int i;

	obuf = dynalloc(size * sizeof(opaque));
	for (i = 0; i < size; i++) {
		obuf[i].byte = buf.memory[i];
	}

	ret.buffer = obuf;
	ret.size = size;
	ret.capacity = size;

	return ret;
}

/********
 * UTIL *
 ********/

struct range_stream_closure {
	size_t max;
	size_t current;
};

static opaque
range_stream_generator(void *state, bit *finished_q) {
	struct range_stream_closure *ctx = state;
	opaque ret;

	if (ctx->current == ctx->max) {
		*finished_q = 1;
		maybe_free(state);
		ret.other = NULL;
		return ret;
	}

	ret.size = ctx->current;
	ctx->current++;
	return ret;
}

static stream
range_stream(size_t n) {
	struct range_stream_closure *ctx;
	stream ret;

	ctx = dynalloc(sizeof(struct range_stream_closure));
	ctx->current = 0;
	ctx->max = n;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = range_stream_generator;
	return ret;
}

static vector
stream_to_vector(stream *s) {
	vector ret = vector_create_empty();
	opaque x;

	while (1) {
		x = stream_read(s);
		if (stream_finished(s)) {
			return ret;
		}

		vector_push(&ret, x);
	}
}

/* NOTE: user must ensure that stream is binary! */
static bitarr
binary_stream_to_bitarr(stream *s) {
	bitarr ret = bitarray_create_empty();
	opaque x;

	while (1) {
		x = stream_read(s);
		if (stream_finished(s)) {
			return ret;
		}

		bitarray_push(&ret, x.binary);
	}
}

struct bitarr_to_stream_closure {
	bitarr *arr;
	size_t i;
};

static opaque
bitarr_to_stream_generator(void *state, bit *finished_q) {
	struct bitarr_to_stream_closure *ctx = state;
	opaque ret;

	if (ctx->i < ctx->arr->bit_size) {
		ret.binary = bitarray_at(*(ctx->arr), ctx->i);
		ctx->i = 1 + ctx->i;
	} else {
		*finished_q = 1;
		maybe_free(state);
		ret.other = NULL;
	}

	return ret;
}

static stream
bitarr_to_stream(bitarr *arr) {
	struct bitarr_to_stream_closure *ctx;
	stream ret;

	ctx = dynalloc(sizeof(struct bitarr_to_stream_closure));
	ctx->arr = arr;
	ctx->i = 0;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = bitarr_to_stream_generator;

	return ret;
}

struct bitarr_to_cycle_stream_closure {
	bitarr arr;
	size_t i;
};

static opaque
bitarr_to_cycle_stream_generator(void *state, bit *finished_q) {
	struct bitarr_to_cycle_stream_closure *ctx = state;
	opaque ret;

	ret.binary = bitarray_at(ctx->arr, ctx->i);
	ctx->i = (1 + ctx->i) % (ctx->arr.bit_size);

	return ret;
}

static stream
bitarr_to_cycle_stream(bitarr arr) {
	struct bitarr_to_cycle_stream_closure *ctx;
	stream ret;

	ctx = dynalloc(sizeof(struct bitarr_to_cycle_stream_closure));
	ctx->arr = arr;
	ctx->i = 0;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = bitarr_to_cycle_stream_generator;

	return ret;
}

struct vector_to_stream_closure {
	vector *vec;
	size_t i;
};

static opaque
vector_to_stream_generator(void *state, bit *finished_q) {
	struct vector_to_stream_closure *ctx = state;
	opaque ret;

	if (ctx->i < ctx->vec->size) {
		ret = ctx->vec->buffer[ctx->i];
		ctx->i = 1 + ctx->i;
	} else {
		*finished_q = 1;
		maybe_free(state);
		ret.other = NULL;
	}

	return ret;
}

static stream
vector_to_stream(vector *vec) {
	struct vector_to_stream_closure *ctx;
	stream ret;

	ctx = dynalloc(sizeof(struct vector_to_stream_closure));
	ctx->vec = vec;
	ctx->i = 0;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = vector_to_stream_generator;

	return ret;
}

struct buffer_to_byte_stream_closure {
	struct buffer *buf;
	size_t i;
};

static opaque
buffer_to_byte_stream_generator(void *state, bit *finished_q) {
	struct buffer_to_byte_stream_closure *ctx = state;
	opaque ret;

	if (ctx->i < ctx->buf->size) {
		ret.byte = ctx->buf->memory[ctx->i];
		ctx->i = 1 + ctx->i;
	} else {
		*finished_q = 1;
		maybe_free(state);
		ret.other = NULL;
	}

	return ret;
}

static stream
buffer_to_byte_stream(struct buffer *buf) {
	struct buffer_to_byte_stream_closure *ctx;
	stream ret;

	ctx = dynalloc(sizeof(struct buffer_to_byte_stream_closure));
	ctx->buf = buf;
	ctx->i = 0;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = buffer_to_byte_stream_generator;

	return ret;
}

struct append_streams_closure {
	size_t len;
	stream **streams_vector;
	size_t pos;
	stream *cur;
};

static opaque
append_streams_generator(void *state, bit *finished_q) {
	struct append_streams_closure *ctx = state;
	opaque x;

	x = stream_read(ctx->cur);
	while (stream_finished(ctx->cur)) {
		ctx->pos = 1 + ctx->pos;
		if (ctx->pos < ctx->len) {
			ctx->cur = ctx->streams_vector[ctx->pos];
			x = stream_read(ctx->cur);
		} else {
			*finished_q = 1;
			maybe_free(ctx->streams_vector);
			maybe_free(ctx);
			break;
		}
	}
	return x;
}

static stream
append_streams(size_t len, stream **streams_vector) {
	struct append_streams_closure *ctx;
	size_t i;
	stream ret;

	ctx = dynalloc(sizeof(struct append_streams_closure));
	ctx->streams_vector = dynalloc(len * sizeof(stream*));

	for (i = 0; i < len; i++) {
		ctx->streams_vector[i] = streams_vector[i];
	}

	ctx->cur = streams_vector[0];
	ctx->len = len;
	ctx->pos = 0;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = append_streams_generator;
	return ret;
}

struct integer_to_binary_stream_s {
	stream me;
	size_t size;
	size_t i;
	size_t n;
	bit auto_free;
};

static opaque
integer_to_binary_stream_generator(void *state, bit *finished_q) {
	struct integer_to_binary_stream_s *ctx = state;
	opaque ret;

	if (ctx->n > 0) {
		ctx->i = ctx->i + 1;
		ret.size = (ctx->n) & 1;
		ctx->n = (ctx->n) >> 1;
		return ret;
	}
	if (ctx->i < ctx->size) {
		ctx->i = ctx->i + 1;
		ret.size = 0;
		return ret;
	}

	*finished_q = 1;
	if (ctx->auto_free) {
		maybe_free(ctx);
	}

	ret.other = NULL;
	return ret;
}

static struct integer_to_binary_stream_s*
integer_to_binary_stream_init(size_t size, size_t n) {
	struct integer_to_binary_stream_s *ret;

	ret = dynalloc(sizeof(struct integer_to_binary_stream_s));
	ret->i = 0;
	ret->n = n;
	ret->size = size;
	ret->auto_free = 0;

	ret->me.finished_q = 0;
	ret->me.state = ret;
	ret->me.generator = integer_to_binary_stream_generator;

	return ret;
}

static stream
integer_to_binary_stream(size_t size, size_t n) {
	struct integer_to_binary_stream_s* s;

	s = integer_to_binary_stream_init(size, n);
	s->auto_free = 1;

	return s->me;
}

static void
integer_to_binary_stream_reset(struct integer_to_binary_stream_s* s, size_t n) {
	s->n = n;
	s->i = 0;
	s->me.finished_q = 0;
}

struct byte_stream_to_binary_stream_closure {
	struct integer_to_binary_stream_s *conv;
	stream *bytes;
};

static opaque
byte_stream_to_binary_stream_generator(void *state, bit *finished_q) {
	struct byte_stream_to_binary_stream_closure *ctx = state;
	opaque ret;
	byte_t n;
	bit x;

	if (ctx->conv == NULL) {
		n = stream_read(ctx->bytes).byte;
		ctx->conv = integer_to_binary_stream_init(8, n);
	}

	x = stream_read(&(ctx->conv->me)).binary;
	if (stream_finished(&(ctx->conv->me))) {
		n = stream_read(ctx->bytes).byte;
		if (stream_finished(ctx->bytes)) {
			*finished_q = 1;
			maybe_free(state);
			ret.other = NULL;
			return ret;
		}
		integer_to_binary_stream_reset(ctx->conv, n);
		x = stream_read(&(ctx->conv->me)).binary;
	}

	ret.binary = x;
	return ret;
}

static stream
byte_stream_to_binary_stream(stream *bytes) {
	struct byte_stream_to_binary_stream_closure *ctx;
	stream ret;

	ctx = dynalloc(sizeof(struct byte_stream_to_binary_stream_closure));
	ctx->conv = NULL;
	ctx->bytes = bytes;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = byte_stream_to_binary_stream_generator;

	return ret;
}

struct pad_stream_closure {
	stream* s;
	size_t block_size;
	size_t i;
	bit finished;
};

static opaque
pad_stream_generator(void *state, bit *finished_q) {
	struct pad_stream_closure *ctx = state;
	opaque ret;
	opaque x;

	if (ctx->finished) {
		if (((ctx->i) % (ctx->block_size)) == 0) {
			*finished_q = 1;
			maybe_free(state);
			ret.other = NULL;
			return ret;
		} else {
			ret.size = 0; /* ASSUMPTION: bit,byte are also gonna be 0 */
			return ret;
		}
	} else {
		x = stream_read(ctx->s);
		if (stream_finished(ctx->s)) {
			ctx->finished = 1;
			if (((ctx->i) % (ctx->block_size)) == 0) {
				*finished_q = 1;
				maybe_free(state);
				ret.other = NULL;
				return ret;
			} else {
				ret.size = 0; /* ASSUMPTION: bit,byte are also gonna be 0 */
				return ret;
			}
		} else {
			return x;
		}
	}
}

static stream
pad_stream(size_t block_size, stream *s) {
	struct pad_stream_closure *ctx;
	stream ret;

	ctx = dynalloc(sizeof(struct pad_stream_closure));
	ctx->block_size = block_size;
	ctx->s = s;
	ctx->i = 0;
	ctx->finished = 0;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = pad_stream_generator;

	return ret;
}

static opaque
binary_stream_to_byte_stream_generator(void *state, bit *finished_q) {
	stream *s = state;
	byte_t count = 0;
	byte_t acc = 0;
	byte_t pow = 1;
	opaque ret;
	bit b;

	while (1) {
		b = stream_read(s).binary;
		if (stream_finished(s)) {
#ifdef DEBUG
			if (!(count == 0)) {
				fprintf(stderr, "NOT PADDED TO 8 BITS!\n");
			}
#endif
			*finished_q = 1;
			ret.other = NULL;
			return ret;
		}

		acc += ((byte_t)b) * pow;
		pow *= 2;
		count++;

		if (count == 8) {
			ret.byte = acc;
			return ret;
		}
	}
}

static stream
binary_stream_to_byte_stream(stream *s) {
	stream ret;

	ret.finished_q = 0;
	ret.state = s;
	ret.generator = binary_stream_to_byte_stream_generator;

	return ret;
}

static byte_t
hex_to_byte(char hex_char) {
	switch (hex_char) {
		case '0': return 0;
		case '1': return 1;
		case '2': return 2;
		case '3': return 3;
		case '4': return 4;
		case '5': return 5;
		case '6': return 6;
		case '7': return 7;
		case '8': return 8;
		case '9': return 9;
		case 'a': return 10;
		case 'A': return 10;
		case 'b': return 11;
		case 'B': return 11;
		case 'c': return 12;
		case 'C': return 12;
		case 'd': return 13;
		case 'D': return 13;
		case 'e': return 14;
		case 'E': return 14;
		case 'f': return 15;
		case 'F': return 15;
		default: {
#ifdef DEBUG
			fprintf(stderr, "GOT A NON HEX CHAR <%c>(= %d)!\n", hex_char, hex_char);
#endif
			return 255;
		}
	}
}

struct hex_to_byte_stream_closure {
	int len;
	int i;
	char *buf;
};

static opaque
hex_to_byte_stream_generator(void *state, bit *finished_q) {
	struct hex_to_byte_stream_closure *cl = state;
	opaque ret;
	char x;
	char y;

	cl->i = cl->i + 2;
	if (cl->i < cl->len) {
		x = hex_to_byte(cl->buf[cl->i]);
		y = 0;
		if (cl->i + 1 < cl->len) {
			y = hex_to_byte(cl->buf[cl->i + 1]);
		}

#ifdef DEBUG
		if (x > 15 || y > 15) {
			fprintf(stderr, "Expected hex character!\n");
		}
#endif

		ret.byte = x * 16 + y;
		return ret;
	} else {
		*finished_q = 1;
		ret.other = NULL;
		return ret;
	}
}

static stream
hex_to_byte_stream(char *ascii) {
	struct hex_to_byte_stream_closure *ctx;
	stream ret;
	int len = 0;

	while (ascii[len]) {
		len++;
	}

	ctx = dynalloc(sizeof(struct hex_to_byte_stream_closure));
	ctx->len = len;
	ctx->i = -2;
	ctx->buf = ascii;

	ret.finished_q = 0;
	ret.state = ctx;
	ret.generator = hex_to_byte_stream_generator;

	return ret;
}

static stream
hex_to_binary_stream(char *ascii) {
	stream *bytes = dynalloc(sizeof(stream));
	*bytes = hex_to_byte_stream(ascii);
	return byte_stream_to_binary_stream(bytes);
}

static void
tm_stream_skip(stream *s, size_t input_wrap_count, size_t input_size, size_t wrap_count, size_t output_size) {
	size_t skip_count = (input_wrap_count * input_size) + (wrap_count * output_size);
	tm_env *env = s->state;
	size_t i;

	for (i = 0; i < skip_count; i++) {
		tm_env_step(env);
		/* stream_read(s); */
	}
}

static opaque
file_to_byte_stream_generator(void *state, bit *finished_q) {
	FILE *fp = state;
	opaque ret;
	int x;

	x = getc(fp);
	if (x == EOF) {
		fclose(fp);
		*finished_q = 1;
		ret.size = 0;
	} else {
		ret.byte = (byte_t)x;
	}

	return ret;
}

static stream*
file_to_byte_stream(char *filepath) {
	stream *ret;

	FILE *fp = fopen(filepath, "rb");
	if (fp == NULL) {
		fprintf(stderr, "COULD NOT OPEN FILE %s!\n", filepath);
		return NULL;
	}

	ret = dynalloc(sizeof(stream));
	ret->finished_q = 0;
	ret->state = fp;
	ret->generator = file_to_byte_stream_generator;

	return ret;
}

static bitarr
tm_get_stream_bitarr(stream *s, size_t input_wrap_count, size_t input_size, size_t wrap_count, size_t output_size) {
	bitarr out = bitarray_alloc(output_size);
	size_t i;
	bit x;

	tm_stream_skip(s, input_wrap_count, input_size, wrap_count, output_size);
	for (i = 0; i < output_size; i++) {
		x = stream_read(s).binary;
		bitarray_set_bit(out, i, x);
	}
	return out;
}

static bitarr
make_machine_from_secret(bitarr *salt_v, size_t machine_size)
{
	size_t len = salt_v->bit_size;
	bitarr output;
	size_t i;
	bit x;

	output = bitarray_alloc(machine_size);

	for (i = 0; i < machine_size; i++) {
		x = bitarray_at(*salt_v, i % len);
		bitarray_set_bit(output, i, x);
	}

	return output;
}

static bitarr
make_key(bitarr *pass_v, bitarr *salt_v, char *filepath, size_t size, size_t machine_size, size_t input_wrap_count, size_t wrap_count)
{
	stream pass_stream;
	stream salt_stream;
	stream *file_byte_stream;
	stream file_stream;
	bitarr machine_bits;
	stream *input_stream_vec[3];
	stream input_stream;
	bitarr input_bits;
	stream input_cycle_stream;
	stream env_stream;
	size_t input_size;

	pass_stream = bitarr_to_stream(pass_v);
	salt_stream = bitarr_to_stream(salt_v);
	file_byte_stream = file_to_byte_stream(filepath);
	file_stream = byte_stream_to_binary_stream(file_byte_stream);

	machine_bits = make_machine_from_secret(salt_v, machine_size);

	input_stream_vec[0] = &pass_stream;
	input_stream_vec[1] = &salt_stream;
	input_stream_vec[2] = &file_stream;
	input_stream = append_streams(3, input_stream_vec);
	input_bits = binary_stream_to_bitarr(&input_stream); /* TODO: dont load file into memory */
	input_cycle_stream = bitarr_to_cycle_stream(input_bits);

	env_stream = make_tm_env(machine_bits, &input_cycle_stream);
	input_size = bitarray_length(input_bits);
	return tm_get_stream_bitarr(&env_stream, input_wrap_count, input_size, wrap_count, size);
}

