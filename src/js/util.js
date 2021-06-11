
function END_OF_STREAM_TOKEN() {
	return END_OF_STREAM_TOKEN;
}

function buffer_from_string(str) {
	var vec = [];
	for (var i = 0; i < str.length; i++) {
		vec.push(str.charCodeAt(i));
	}
	return new Uint8Array(vec);
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

function bitarr_to_stream(arr) {
	return vector_to_stream(bitarr_to_vector_inplace(arr));
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

function buffer_to_binary_stream(buf) {
	var bytes = buffer_to_byte_stream(buf);
	return byte_stream_to_binary_stream(bytes);
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

function hex_to_byte_stream(ascii) {
	var i = -2;

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
		i = i + 2;
		if (i < ascii.length) {
			var x = hex_table[ascii[i]];
			var y = 0; // NOTE: this is padding. TODO: better solution?
			if (i + 1 < ascii.length) {
				y = hex_table[ascii[i + 1]];
			}

			if (x == undefined || y == undefined) {
				throw "Expected hex character!";
			} else {
				return x * 16 + y;
			}
		} else {
			return END_OF_STREAM_TOKEN;
		}
	}

	return pop;
}

function hex_to_binary_stream(ascii) {
	var pop = hex_to_byte_stream(ascii);
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

function stream_read_n_bitarr(n, stream) {
	return vector_to_bitarr_inplace(stream_read_n_vector(n, stream));
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
	var len = js_Buffer.length;

	function pop() {
		i = i + 1;
		if (i < len) {
			return js_Buffer[i];
		} else {
			return END_OF_STREAM_TOKEN;
		}
	}

	return pop;
}

function vector_to_bitarr_inplace(vec) {
	return vec;
}

function bitarr_to_vector_inplace(arr) {
	return arr;
}

function binary_stream_to_bitarr(stream) {
	return vector_to_bitarr_inplace(stream_to_vector(stream));
}

function buffer_to_vector(buffer) {
	return buffer;
}

function byte_stream_to_byte_buffer(stream) {
	return new Uint8Array(stream_to_vector(stream));
}

function normalize_text_char(c) {
	switch (c) {
		case 'a': return 'a';
		case 'b': return 'b';
		case 'c': return 'c';
		case 'd': return 'd';
		case 'e': return 'e';
		case 'f': return 'f';
		case 'g': return 'g';
		case 'h': return 'h';
		case 'i': return 'i';
		case 'j': return 'j';
		case 'k': return 'k';
		case 'l': return 'l';
		case 'm': return 'm';
		case 'n': return 'n';
		case 'o': return 'o';
		case 'p': return 'p';
		case 'q': return 'q';
		case 'r': return 'r';
		case 's': return 's';
		case 't': return 't';
		case 'u': return 'u';
		case 'v': return 'v';
		case 'w': return 'w';
		case 'x': return 'x';
		case 'y': return 'y';
		case 'z': return 'z';

		case 'A': return 'a';
		case 'B': return 'b';
		case 'C': return 'c';
		case 'D': return 'd';
		case 'E': return 'e';
		case 'F': return 'f';
		case 'G': return 'g';
		case 'H': return 'h';
		case 'I': return 'i';
		case 'J': return 'j';
		case 'K': return 'k';
		case 'L': return 'l';
		case 'M': return 'm';
		case 'N': return 'n';
		case 'O': return 'o';
		case 'P': return 'p';
		case 'Q': return 'q';
		case 'R': return 'r';
		case 'S': return 's';
		case 'T': return 't';
		case 'U': return 'u';
		case 'V': return 'v';
		case 'W': return 'w';
		case 'X': return 'x';
		case 'Y': return 'y';
		case 'Z': return 'z';

		default: return ' ';
	}
}

function normalize_text_buffer(buf) {
	var i;
	var is_last_unknown = true; /* to trim left pretend that we begin with whitespace */
	var ret = [];
	var len = buf.length;

	var space = ' '.charCodeAt(0);

	for (i = 0; i < len; i++) {
		var c = String.fromCharCode(buf[i]);
		var x = normalize_text_char(c).charCodeAt(0);

		var is_current_unknown = (x == space);

		if (is_last_unknown && is_current_unknown) {
			continue;
		} else if (is_last_unknown && !is_current_unknown) {
			if (ret.length != 0) {
				ret.push(space);
			}

			ret.push(x);
		} else if (!is_last_unknown && !is_current_unknown) {
			ret.push(x);
		}

		is_last_unknown = is_current_unknown;
	}

	var arr = new Uint8Array(ret);
	return arr;
}

function closest_power_of_two(x) {
	var ret = 1;

	while (ret < x) {
		ret *= 2;
	}

	return ret;
}

function make_machine_from_secret(salt_vector, machine_size) {
	var len = salt_vector.length;
	var output = bitarray_alloc(machine_size);

	if (len < machine_size) {
		console.log("Padding SALT from", len, "to", machine_size);
	}

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
function make_key(pass_v, salt_v, file_buffer, size, input_wrap_count, wrap_count) {
	var pass_stream = vector_to_stream(pass_v);
	var salt_stream = vector_to_stream(salt_v);
	var file_v = binary_stream_to_bitarr(byte_stream_to_binary_stream(buffer_to_byte_stream(file_buffer)));
	var file_stream = vector_to_stream(file_v);
	var machine_bits = make_machine_from_secret(salt_v, closest_power_of_two(bitarray_length(salt_v)));

	var input_stream = append_streams([pass_stream, salt_stream, file_stream]);
	var input_bits = binary_stream_to_bitarr(input_stream);
	var input_cycle_stream = bitarr_to_cycle_stream(input_bits);

	var env_stream = make_tm_env(machine_bits, input_cycle_stream);
	var input_size = bitarray_length(input_bits);
	return tm_get_stream_bitarr(env_stream, input_wrap_count, input_size, wrap_count, size);
}

var BLOCK_LEN = 8;
var SIZE_BLOCK_LEN = 4 * BLOCK_LEN; // 32 bit integer

function xor_with_key(key_tape, input_file_bitarr) {
	var key_size = bitarray_length(key_tape);
	function xorer(i) {
		return key_tape[i] ^ bitarray_at(input_file_bitarr, i);
	}

	var xored_stream = stream_map(stream_range(key_size), xorer);
	return xored_stream;
}

function handle_file_buffer(encryptQ, pass_s, salt, keyfile_buffer0, input_wrap_count, wrap_count, input_file_bitarr, output_cb) {
	var pass_buf0 = buffer_from_string(pass_s);
	var pass_buf = normalize_text_buffer(pass_buf0);
	var pass = binary_stream_to_bitarr(buffer_to_binary_stream(pass_buf));
	var key_size = bitarray_length(input_file_bitarr);
	var keyfile_buffer = normalize_text_buffer(keyfile_buffer0);

	var key = make_key(pass, salt, keyfile_buffer, key_size, input_wrap_count, wrap_count);
	var xored_stream = xor_with_key(key, input_file_bitarr);

	if (encryptQ) {
		var salt_stream = bitarr_to_stream(salt);
		var salt_len = salt.length;
		var salt_len_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, salt_len);
		var key_size_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, key_size);
		var input_wrap_count_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, input_wrap_count);
		var wrap_count_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, wrap_count);

		var binary_stream = append_streams([input_wrap_count_stream, wrap_count_stream, salt_len_stream, salt_stream, key_size_stream, xored_stream]);
		var padded_stream = pad_stream(BLOCK_LEN, binary_stream);
		var byte_stream = binary_stream_to_byte_stream(padded_stream);
		var buf = byte_stream_to_byte_buffer(byte_stream);

		output_cb(buf);
	} else {
		var byte_stream = binary_stream_to_byte_stream(xored_stream);
		var buf = byte_stream_to_byte_buffer(byte_stream);
		output_cb(buf);
	}
}

function encrypt(pass_s, salt_s, keyfile_buffer, input_wrap_count_s, wrap_count_s, input_file_buffer, output_cb) {
	var salt = binary_stream_to_bitarr(hex_to_binary_stream(salt_s));
	var input_file_stream = byte_stream_to_binary_stream(buffer_to_byte_stream(input_file_buffer));
	var input_file_bitarr = binary_stream_to_bitarr(input_file_stream);
	var input_wrap_count = parseInt(input_wrap_count_s);
	var wrap_count = parseInt(wrap_count_s);
	return handle_file_buffer(true, pass_s, salt, keyfile_buffer, input_wrap_count, wrap_count, input_file_bitarr, output_cb);
}

function decrypt(pass, keyfile_buffer, input_file_buffer, output_cb) {
	var input_file_stream = byte_stream_to_binary_stream(buffer_to_byte_stream(input_file_buffer));

	var input_wrap_count = binary_stream_read_integer(SIZE_BLOCK_LEN, input_file_stream);
	var wrap_count = binary_stream_read_integer(SIZE_BLOCK_LEN, input_file_stream);
	var salt_len = binary_stream_read_integer(SIZE_BLOCK_LEN, input_file_stream);
	var salt = stream_read_n_bitarr(salt_len, input_file_stream);
	var xored_len = binary_stream_read_integer(SIZE_BLOCK_LEN, input_file_stream);
	var xored_bitarr = stream_read_n_bitarr(xored_len, input_file_stream);

	return handle_file_buffer(false, pass, salt, keyfile_buffer, input_wrap_count, wrap_count, xored_bitarr, output_cb);
}
