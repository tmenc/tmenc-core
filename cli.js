
var readline = require("readline");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

var END_OF_STREAM_TOKEN = "end-of-stream-lol";

function integer_to_binary_stream(push, n) {
	while (n > 0)
	{
		var x = n % 2;
		push(x);
		n = n / 2;
	}
}

function integer_stream_to_binary_stream(push, pop) {
	while (true) {
		var n = pop();
		if (n === END_OF_STREAM_TOKEN) {
			return;
		}
		integer_to_binary_stream(push, n);
	}
}

function ascii_to_numbers(ascii) {
	var vec = [];

	for (var i = 0; i < ascii.length; i++) {
		var integ = ascii.charCodeAt(i);
		console.log(`ascii[${i}] = ${integ}`);
		vec.push(integ);
	}

	return vec;
}

function ascii_to_binary(ascii) {
	var vec = ascii_to_numbers(ascii);

	var i = 0;
	function pop() {
		if (i == vec.length) {
			return END_OF_STREAM_TOKEN;
		}
		return vec[i];
	}

	var ret = [];
	function push(x) {
		ret.push(x);
	}

	integer_stream_to_binary_stream(push, pop);

	return ret;
}

rl.question('pass: ', (pass) => {
	rl.question("file: ", (file) => {

		var nums = ascii_to_binary(pass);
		console.log(nums);

		rl.close();
	});
});

