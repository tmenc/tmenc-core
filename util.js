
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

function ascii_to_binary_s(ascii) {
	var pop = ascii_to_numbers(ascii);
	return byte_stream_to_binary_stream(pop);
}

function ascii_to_binary(ascii) {
	return stream_to_vector(ascii_to_binary_s(ascii));
}

module.exports = {
	ascii_to_binary: ascii_to_binary
};
