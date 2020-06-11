
function END_OF_STREAM_TOKEN() {
	return END_OF_STREAM_TOKEN;
}

function stream_to_vector(pop) {
	var vec = [];
	while (true) {
		var x = pop();
		if (x === END_OF_STREAM_TOKEN) {
			return vec;
		}
		vec.push(x);
	}
}

function vector_to_stream(vec) {
	var i = -1;
	var len = vec.length;
	return function() {
		i = i + 1;
		if (i < len) {
			return vec[i];
		} else {
			return END_OF_STREAM_TOKEN;
		}
	}
}

function append_streams(streams_vector) {
	var pos = 0;
	var cur = streams_vector[0];
	var len = streams_vector.length;
	return function () {
		var x = cur();
		while (x === END_OF_STREAM_TOKEN) {
			pos = pos + 1;
			if (pos < len) {
				cur = streams_vector[pos];
				x = cur();
			} else {
				return END_OF_STREAM_TOKEN;
			}
		}
		return x;
	}
}

// LITTLE ENDIAN?
function integer_to_binary_stream_init(size) {
	var i = size;
	var n = -1;

	return function(new_n) {
		if (new_n !== undefined) {
			i = -1;
			n = new_n;
			return;
		}

		i = i + 1;
		if (n > 0) {
			var x = n & 1;
			n = n >> 1;
			return x;
		}
		if (i < size) {
			return 0;
		}
		return END_OF_STREAM_TOKEN;
	}
}

function integer_to_binary_stream(size, n) {
	var f = integer_to_binary_stream_init(size);
	f(n);
	return f;
}

function byte_stream_to_binary_stream(pop) {
	var conv = integer_to_binary_stream_init(8);

	return function() {
		var x = conv();
		if (x === END_OF_STREAM_TOKEN) {
			var n = pop();
			if (n === END_OF_STREAM_TOKEN) {
				return END_OF_STREAM_TOKEN;
			}
			conv(n);
			return conv();
		} else {
			return x;
		}
	};
}

function pad_stream(block_size, stream) {
	var i = -1;
	var finished = false;
	return function() {
		i = i + 1;
		if (finished) {
			if (i % block_size == 0) {
				return END_OF_STREAM_TOKEN;
			} else {
				return 0;
			}
		} else {
			var x = stream();
			if (x == END_OF_STREAM_TOKEN) {
				finished = true;
				if (i % block_size == 0) {
					return END_OF_STREAM_TOKEN;
				} else {
					return 0;
				}
			} else {
				return x;
			}
		}
	}
}

function binary_stream_to_byte_stream(pop) {
	return function() {
		var count = 0;
		var acc = 0;
		var pow = 1;
		while (true) {
			var b = pop();

			if (b == END_OF_STREAM_TOKEN) {
				if (count !== 0) {
					throw "NOT PADDED TO 8 BITS!";
				}
				return END_OF_STREAM_TOKEN;
			}

			acc += b * pow;
			pow *= 2;
			count++;

			if (count == 8) {
				return acc;
			}
		}
	};
}

function ascii_to_numbers(ascii) {
	var i = -1;
	return function() {
		i = i + 1;
		if (i < ascii.length) {
			return ascii.charCodeAt(i);
		} else {
			return END_OF_STREAM_TOKEN;
		}
	};
}

function hex_to_numbers(ascii) {
	var i = -1;

	var hex_table = {
		'0': 0,
		'1': 1,
		'2': 2,
		'3': 3,
		'4': 4,
		'5': 5,
		'6': 6,
		'7': 7,
		'8': 8,
		'9': 9,
		'a': 10,
		'A': 10,
		'b': 11,
		'B': 11,
		'c': 12,
		'C': 12,
		'd': 13,
		'D': 13,
		'e': 14,
		'E': 14,
		'f': 15,
		'F': 15,
	};

	function pop() {
		i = i + 1;
		if (i < ascii.length) {
			var x = hex_table[ascii[i]];
			if (x == undefined) {
				throw "Expected hex character!";
			} else {
				return x;
			}
		} else {
			return END_OF_STREAM_TOKEN;
		}
	}

	return pop;
}

function hex_to_binary_stream(ascii) {
	var pop = hex_to_numbers(ascii);
	return byte_stream_to_binary_stream(pop);
}

function ascii_to_binary_stream(ascii) {
	var pop = ascii_to_numbers(ascii);
	return byte_stream_to_binary_stream(pop);
}

function ascii_to_binary(ascii) {
	return binary_stream_to_bitarr(ascii_to_binary_stream(ascii));
}

function stream_range(n) {
	var i = -1;
	return function() {
		i = i + 1;
		if (i >= n) {
			return END_OF_STREAM_TOKEN;
		} else {
			return i;
		}
	};
}

function binary_stream_read_integer(size, stream) {
	var ret = 0;
	var pow = 1;
	for (var i = 0; i < size; i++) {
		var x = stream();
		if (x == END_OF_STREAM_TOKEN) {
			throw 'Asked for integer that is bigger in size than the stream';
		}
		ret += pow * x;
		pow *= 2;
	}
	return ret;
}

function stream_read_n_vector(n, stream) {
	var vec = new Array(n);
	for (var i = 0; i < n; i++) {
		var x = stream();
		if (x == END_OF_STREAM_TOKEN) {
			throw 'Asked for n bits, but stream doesnt have that much';
		}
		vec[i] = x;
	}
	return vec;
}

function stream_read_n_stream(n, stream) {
	var i = -1;
	return function() {
		i = i + 1;
		if (i >= n) {
			return END_OF_STREAM_TOKEN;
		} else {
			return stream();
		}
	};
}

function stream_map(stream, fn) {
	return function() {
		var x = stream();
		if (x == END_OF_STREAM_TOKEN) {
			return END_OF_STREAM_TOKEN;
		} else {
			return fn(x);
		}
	};
}

function buffer_to_byte_stream(js_Buffer) {
	var i = -1;

	function pop() {
		i = i + 1;
		if (i < js_Buffer.length) {
			return js_Buffer.readUInt8(i);
		} else {
			return END_OF_STREAM_TOKEN;
		}
	}

	return pop;
}

function vector_to_bitarr_inplace(vec) {
	return vec;
}

function binary_stream_to_bitarr(stream) {
	return vector_to_bitarr_inplace(stream_to_vector(stream));
}

function buffer_to_vector(buffer) {
	return buffer;
}

function byte_stream_to_byte_buffer(stream) {
	var vec = stream_to_vector(stream);
	var size = vec.length;
	var buf = Buffer.alloc(size);

	for (var i = 0; i < size; i++) {
		var x = vec[i];
		buf.writeUInt8(x, i);
	}
	return buf;
}

function make_machine_from_secret(salt_vector, machine_size) {
	var len = salt_vector.length;
	var output = bitarray_alloc(machine_size);

	for (var i = 0; i < machine_size; i++) {
		bitarray_set_bit(output, i, salt_vector[i % len]);
	}

	return output;
}

function tm_stream_skip(stream, input_wrap_count, input_size, wrap_count, output_size) {
	var skip_count = (input_wrap_count * input_size) + (wrap_count * output_size);
	for (var i = 0; i < skip_count; i++) {
		stream();
	}
}

function tm_get_stream_bitarr(env_stream, input_wrap_count, input_size, wrap_count, output_size) {
	tm_stream_skip(env_stream, input_wrap_count, input_size, wrap_count, output_size);

	var out = bitarray_alloc(output_size);
	for (var i = 0; i < output_size; i++) {
		bitarray_set_bit(out, i, env_stream());
	}
	return out;
}

function bitarr_to_cycle_stream(arr) {
	var i = -1;
	var len = bitarray_length(arr);
	return function() {
		i = (i + 1) % len;
		return bitarray_at(arr, i);
	};
}

// NOTE: `wrap_count' should depend on `length(pass++salt++file)'
// salt should to be different for each key!
function make_key(pass_v, salt_v, file_buffer, size, machine_size, input_wrap_count, wrap_count) {
	var pass_stream = vector_to_stream(pass_v);
	var salt_stream = vector_to_stream(salt_v);
	var file_v = binary_stream_to_bitarr(byte_stream_to_binary_stream(buffer_to_byte_stream(file_buffer)));
	var file_stream = vector_to_stream(file_v);

	var machine_bits = make_machine_from_secret(salt_v, machine_size);

	var input_stream = append_streams([pass_stream, salt_stream, file_stream]);
	var input_bits = binary_stream_to_bitarr(input_stream);
	var input_cycle_stream = bitarr_to_cycle_stream(input_bits);

	var env_stream = make_tm_env(machine_bits, input_cycle_stream);
	var input_size = bitarray_length(input_bits);
	return tm_get_stream_bitarr(env_stream, input_wrap_count, input_size, wrap_count, size);
}

