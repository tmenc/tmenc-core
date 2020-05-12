
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

function append_2_streams(pop1, pop2) {
	var first = true;
	var cur = pop1;
	return function () {
		var x = cur();
		if (x === END_OF_STREAM_TOKEN) {
			if (first) {
				first = false;
				cur = pop2;
				x = cur();
			}
		}
		return x;
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
		if (new_n) {
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

	function ret() {
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
	}

	return ret;
}

function ascii_to_numbers(ascii) {
	var i = -1;
	function pop() {
		i = i + 1;
		if (i < ascii.length) {
			return ascii.charCodeAt(i);
		} else {
			return END_OF_STREAM_TOKEN;
		}
	}

	return pop;
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

function buffer_to_byte_stream(js_Buffer) {
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
