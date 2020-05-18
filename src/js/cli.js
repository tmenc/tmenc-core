
var readline = require("readline");
var fs = require("fs");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
});

function debug_vec(v) {
	console.log('len(v):', v.length, 'v:', v);
}

var BLOCK_LEN = 8;
var SIZE_BLOCK_LEN = 4 * BLOCK_LEN; // 32 bit integer

function read_things(keys, callback) {
	var i = 0;
	var arr = [];

	function rlcb(x) {
		arr.push(x);
		// console.log('arr[' + keys[i] + '] = ' + x);
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

function make_key_from_parameters(pass, salt, file_buffer, machine_size, wrap_count, key_size) {
	var key = make_key(pass, salt, file_buffer, key_size, machine_size, wrap_count);
	debug_vec(key)

	return key;
}

function handle_file_buffer(encryptQ, pass_s, salt, file_buffer, machine_size, wrap_count, input_file_bitarr, output_file_path) {
	var pass = binary_stream_to_bitarr(hex_to_binary_stream(pass_s));
	var key_size = bitarray_length(input_file_bitarr);

	var key = make_key_from_parameters(pass, salt, file_buffer, machine_size, wrap_count, key_size);
	var xored_stream = xor_with_key(key, input_file_bitarr);

	if (encryptQ) {
		var salt_stream = vector_to_stream(salt);
		var salt_len = salt.length;
		var salt_len_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, salt_len);
		var key_size_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, key_size);
		var machine_size_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, machine_size);
		var wrap_count_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, wrap_count);

		var binary_stream = append_streams([machine_size_stream, wrap_count_stream, salt_len_stream, salt_stream, key_size_stream, xored_stream]);
		var padded_stream = pad_stream(BLOCK_LEN, binary_stream);
		var byte_stream = binary_stream_to_byte_stream(padded_stream);
		var buf = byte_stream_to_byte_buffer(byte_stream);

		console.log('encrypt buf:', buf);
		fs.writeFileSync(output_file_path, buf);
	} else {
		var byte_stream = binary_stream_to_byte_stream(xored_stream);
		var buf = byte_stream_to_byte_buffer(byte_stream);
		fs.writeFileSync(output_file_path, buf);
	}
}

function encrypt_file() {
	function read_cb(pass_s, salt_s, file, machine_size_s, wrap_count_s, input_file_path, output_file_path) {
		var file_buffer = fs.readFileSync(file);
		var input_file_buffer = fs.readFileSync(input_file_path);
		var salt = binary_stream_to_bitarr(hex_to_binary_stream(salt_s));
		var input_file_stream = byte_stream_to_binary_stream(buffer_to_byte_stream(input_file_buffer));
		var input_file_bitarr = binary_stream_to_bitarr(input_file_stream);
		var machine_size = parseInt(machine_size_s);
		var wrap_count = parseInt(wrap_count_s);
		return handle_file_buffer(true, pass_s, salt, file_buffer, machine_size, wrap_count, input_file_bitarr, output_file_path);
	}

	read_things(['pass', 'salt', 'keyfile', 'machine-size', 'wrap-count', 'input-file', 'output-file'], read_cb);
}

function decrypt_file() {
	function read_cb(pass_s, file, input_file_path, output_file_path) {
		var file_buffer = fs.readFileSync(file);

		var input_file_buffer = fs.readFileSync(input_file_path);
		var input_file_stream = byte_stream_to_binary_stream(buffer_to_byte_stream(input_file_buffer));

		var machine_size = binary_stream_read_integer(SIZE_BLOCK_LEN, input_file_stream);
		var wrap_count = binary_stream_read_integer(SIZE_BLOCK_LEN, input_file_stream);
		var salt_len = binary_stream_read_integer(SIZE_BLOCK_LEN, input_file_stream);
		var salt = stream_read_n_vector(salt_len, input_file_stream);
		var xored_len = binary_stream_read_integer(SIZE_BLOCK_LEN, input_file_stream);
		var xored_bitarr = binary_stream_to_bitarr(stream_read_n_stream(xored_len, input_file_stream));

		console.log('salt_len:', salt_len);
		console.log('xored_len:', xored_len);

		return handle_file_buffer(false, pass_s, salt, file_buffer, machine_size, wrap_count, xored_bitarr, output_file_path);
	}
	read_things(['pass', 'keyfile', 'input-file', 'output-file'], read_cb);
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

