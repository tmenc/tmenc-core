
// works on uint32_t
function init_simple_rng_ref(seed) {
	var x = seed;
	var mod = 4294967296; // 2 ^ 32
	function to1bit (z) {
		if (z > 2147483648) { return 1; }
		else { return 0; }
	}
	return function () {
		x = (((x * 1664525) % mod) + 1013904223) % mod;
		return to1bit(x);
	};
}

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
function integer_to_binary_stream(size) {
	var i = size;
	var n = -1;

	return function(new_n) {
		if (new_n !== undefined) {
			i = -1;
			n = new_n;
			return;
		}

		i = i + 1;
		if (n > 0)
		{
			var x = n % 2;
			n = Math.floor(n / 2);
			return x;
		}
		if (i < size) {
			return 0;
		}
		return END_OF_STREAM_TOKEN;
	}
}

function byte_stream_to_binary_stream(pop) {
	var conv = integer_to_binary_stream(8);

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
	return stream_to_vector(ascii_to_binary_stream(ascii));
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

function buffer_to_stream(js_Buffer) {
	var i = -1;

	function pop() {
		i = i + 1;
		if (i < js_Buffer.length) {
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

function stream_to_bitarr(stream) {
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

function make_machine_from_secret(pass_vector, salt_vector, file_vector, machine_size) {
	function vector_to_cycle_vector(a) {
		var len = a.length;
		return function(i) {
			return a[i % len];
		}
	}

	// This is really ugly
	// But we are doing this only to normalize machine bits
	// Nothing important
	var weak_rng = init_simple_rng_ref(777);
	var pass_cv  = vector_to_cycle_vector(pass_vector);
	var salt_cv  = vector_to_cycle_vector(salt_vector);
	var file_cv  = vector_to_cycle_vector(file_vector);

	var output = new Array(machine_size);

	for (var i = 0; i < machine_size; i++) {
		output[i] = weak_rng() ^ pass_cv(i) ^ salt_cv(i) ^ file_cv(i);
	}

	return output;
}

function tm_run_for_wc(env, wc) {
	function is_tm_finished(env, wc) {
		return env.read_tape_read_all() && env.write_tape_wrap_count() >= wc;
	}

	var step = env.step;
	while (!is_tm_finished(env, wc)) {
		step();
	}
}

