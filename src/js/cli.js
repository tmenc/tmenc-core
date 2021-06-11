
var readline = require("readline");
var fs = require("fs");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
});

function read_things(keys, callback) {
	var i = 0;
	var arr = [];

	function rlcb(x) {
		arr.push(x);
		i++;
		if (i < keys.length) {
			rl.question(keys[i] + ': ', rlcb);
		} else {
			callback.apply(null, arr);
		}
	}

	rl.question(keys[0] + ': ', rlcb);
}

function encrypt_file() {
	read_things(['pass', 'salt', 'keyfile', 'input_wrap_count', 'wrap_count', 'input_file', 'output_file'], encrypt);
}

function decrypt_file() {
	read_things(['pass', 'keyfile', 'input_file', 'output_file'], decrypt);
}

function entry() {
	rl.question('encrypt/decrypt', function (x) {
		if (x == 'encrypt') {
			encrypt_file();
		} else if (x == 'decrypt') {
			decrypt_file();
		} else {
			throw 'expected encrypt or decrypt';
		}
	});
}

entry();

