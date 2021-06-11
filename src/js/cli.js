
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
	function read_cb(pass_s, salt_s, keyfile, input_wrap_count_s, wrap_count_s, input_file, output_file) {
		function output_cb(buf) {
			fs.writeFileSync(output_file, buf);
		}

		var keyfile_buffer = fs.readFileSync(keyfile);
		var input_file_buffer = fs.readFileSync(input_file);
		encrypt(pass_s, salt_s, keyfile_buffer, input_wrap_count_s, wrap_count_s, input_file_buffer, output_cb);
	}

	read_things(['pass', 'salt', 'keyfile', 'input_wrap_count', 'wrap_count', 'input_file', 'output_file'], read_cb);
}

function decrypt_file() {
	function read_cb(pass, keyfile, input_file, output_file) {
		function output_cb(buf) {
			fs.writeFileSync(output_file, buf);
		}

		var keyfile_buffer = fs.readFileSync(keyfile);
		var input_file_buffer = fs.readFileSync(input_file);
		decrypt(pass, keyfile_buffer, input_file_buffer, output_cb);
	}

	read_things(['pass', 'keyfile', 'input_file', 'output_file'], read_cb);
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

