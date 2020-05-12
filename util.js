
var END_OF_STREAM_TOKEN = "end-of-stream-lol";

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

function append_streams(pop1, pop2) {
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

// LITTLE ENDIAN?
function integer_to_binary_stream(n, size) {
	var i = -1;

	function pop() {
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

	return pop;
}

function byte_stream_to_binary_stream(pop) {
	var finished = true;
	var r = undefined;

	function ret() {
		if (finished) {
			var n = pop();
			if (n === END_OF_STREAM_TOKEN) {
				return END_OF_STREAM_TOKEN;
			}
			r = integer_to_binary_stream(n, 8);
			finished = false;
		}

		var x = r();
		if (x === END_OF_STREAM_TOKEN) {
			finished = true;
			return ret();
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

function ascii_to_binary_stream(ascii) {
	var pop = ascii_to_numbers(ascii);
	return byte_stream_to_binary_stream(pop);
}

function ascii_to_binary(ascii) {
	return stream_to_vector(ascii_to_binary_stream(ascii));
}

function generate_new_randomized_input_stream(pass_stream, file_stream) {
	var seedr = Math.floor(Math.random() * Math.pow(2, 32));

	// TODO: Make not related to seedr
	var r = Math.floor(Math.random() * Math.pow(2, 32));

	var rs = integer_to_binary_stream(r, 32);
	var seedrs = integer_to_binary_stream(seedr, 32);

	return append_streams(seedrs, append_streams(rs, append_streams(pass_stream, file_stream)));
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
