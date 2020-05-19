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
vector_create_empty() {
	vector ret;
	ret.size = 0;
	ret.capacity = 128;
	ret.buffer = dynalloc((ret.capacity) * sizeof(opaque));
#ifdef DEBUG
	if (ret.buffer == NULL) {
		fprintf(stderr, "COULD NOT ALLOCATE EMPTY VECTOR\n");
	}
#endif
	return ret;
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
	ret.generator = byte_stream_to_binary_stream_generator;

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
			fprintf(stderr, "GOT A NON HEX CHAR!\n");
#endif
			return 255;
		}
	}
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

