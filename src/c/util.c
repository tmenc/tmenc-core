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
		if (arr->buffer == NULL) {
			printf("COULD NOT GROW VECTOR TO SIZE %lu\n", (unsigned long)size);
		}
		arr->bit_capacity = size * CONTAINER_BITS;
	}

	arr->bit_size++;
	bitarray_set_bit(*arr, arr->bit_size - 1, o);
}

static void
bitarray_free(bitarr *arr) {
	free(arr->buffer);
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
	ret.buffer = malloc((ret.capacity) * sizeof(opaque));
	if (ret.buffer == NULL) {
		printf("COULD NOT ALLOCATE EMPTY VECTOR\n");
	}
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
		if (vec->buffer == NULL) {
			printf("COULD NOT GROW VECTOR TO SIZE %lu\n", (unsigned long)(vec->capacity));
		}
	}
	vec->buffer[vec->size] = object;
	vec->size++;
}

static void
vector_free(vector *vec) {
	free(vec->buffer);
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
		free(state);
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

	ctx = malloc(sizeof(struct range_stream_closure));
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
stream_to_bitarr(stream *s) {
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
			free(ctx->streams_vector);
			free(ctx);
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

	ctx = malloc(sizeof(struct append_streams_closure));
	ctx->streams_vector = malloc(len * sizeof(stream*));

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
		free(ctx);
	}

	ret.other = NULL;
	return ret;
}

static struct integer_to_binary_stream_s*
integer_to_binary_stream_init(size_t size, size_t n) {
	struct integer_to_binary_stream_s *ret;

	ret = malloc(sizeof(struct integer_to_binary_stream_s));
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

