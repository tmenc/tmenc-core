
var readline = require("readline");
var fs = require("fs");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
});

var BLOCK_LEN = 8;
var SIZE_BLOCK_LEN = 4 * BLOCK_LEN; // 32 bit integer

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

function xor_with_key(key_tape, input_file_bitarr) {
	var key_size = bitarray_length(key_tape);
	function xorer(i) {
		return key_tape[i] ^ bitarray_at(input_file_bitarr, i);
	}

	var xored_stream = stream_map(stream_range(key_size), xorer);
	return xored_stream;
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

