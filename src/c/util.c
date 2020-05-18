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
		arr->bit_capacity = size * BITS_IN_SIZEOF;
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

