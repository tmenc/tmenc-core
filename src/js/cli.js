
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

function handle_file_buffer(pass_s, salt_s, file_buffer, machine_size_s, wrap_count_s, input_file_path, output_file_path) {
	var pass = stream_to_vector(hex_to_binary_stream(pass_s));
	var salt = stream_to_vector(hex_to_binary_stream(salt_s));
	var machine_size = parseInt(machine_size_s);
	var wrap_count = parseInt(wrap_count_s);
	var input_file_buffer = fs.readFileSync(input_file_path);

	var input_file_stream = byte_stream_to_binary_stream(buffer_to_byte_stream(input_file_buffer));
	var input_file_bits = stream_to_bitarr(input_file_stream);
	var key_size = bitarray_length(input_file_bits);

	var key = make_key(pass, salt, file_buffer, key_size, machine_size, wrap_count);
	debug_vec(key)

	function xorer(i) {
		return key[i] ^ input_file_bits[i];
	}
	var xored_stream = stream_map(stream_range(key_size), xorer);
	var key_size_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, key_size);

	var salt_stream = vector_to_stream(salt);
	var salt_len = salt.length;
	var salt_len_stream = integer_to_binary_stream(SIZE_BLOCK_LEN, salt_len);

	var binary_stream = append_streams([salt_len_stream, salt_stream, key_size_stream, xored_stream]);
	var padded_stream = pad_stream(BLOCK_LEN, binary_stream);

	// var padded_vec = stream_to_vector(padded_stream);
	// console.log('padded:', padded_vec);
	// padded_stream = vector_to_stream(padded_vec);

	var byte_stream = binary_stream_to_byte_stream(padded_stream);
	var buf = byte_stream_to_byte_buffer(byte_stream);

	// var s1 = buffer_to_byte_stream(buf);
	// var s2 = byte_stream_to_binary_stream(s1);
	// var s3 = stream_to_vector(s2);
	// console.log('wtf:', s3)

	fs.writeFileSync(output_file_path, buf);
}

function encode_file() {
	function read_cb(pass_s, salt_s, file, machine_size_s, wrap_count_s, input_file_path, output_file_path) {
		var file_buffer = fs.readFileSync(file);
		return handle_file_buffer(pass_s, salt_s, file_buffer, machine_size_s, wrap_count_s, input_file_path, output_file_path);
	}

	read_things(['pass', 'salt', 'keyfile', 'machine-size', 'wrap-count', 'input-file', 'output-file'], read_cb);
}

function decode_file() {
	function read_cb(pass_s, file, machine_size_s, wrap_count_s, input_file_path, output_file_path) {
		var file_buffer = fs.readFileSync(file);
		var file_stream = byte_stream_to_binary_stream(buffer_to_byte_stream(file_buffer));
		// var salt_len = binary_stream_read_integer(SIZE_BLOCK_LEN, file_stream);
		var salt_len = stream_read_n_vector(SIZE_BLOCK_LEN, file_stream);
		console.log('salt_len:', salt_len);
	}
	read_things(['pass', 'keyfile', 'machine-size', 'wrap-count', 'input-file', 'output-file'], read_cb);
}

function entry() {
	rl.question('encode/decode', function (x) {
		if (x == 'encode') {
			encode_file();
		} else if (x == 'decode') {
			decode_file();
		} else {
			throw 'expected encode or decode';
		}
	});
}

entry();

