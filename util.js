
var END_OF_STREAM_TOKEN = "end-of-stream-lol";

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

function integer_stream_to_binary_stream(pop) {
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

	ret;
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

function ascii_to_binary(ascii) {
	var pop = ascii_to_numbers(ascii);

	var ret = [];
	function push(x) {
		ret.push(x);
	}

	integer_stream_to_binary_stream(push, pop);

	return ret;
}

module.exports = {
	ascii_to_binary: ascii_to_binary
};
