
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

rl.question('pass: ', (pass_s) => {
	var pass = stream_to_vector(hex_to_binary_stream(pass_s));
	rl.question("salt: ", (salt_s) => {
		var salt = stream_to_vector(hex_to_binary_stream(salt_s));
		rl.question("keyfile: ", (file) => {
			rl.question("machine-size: ", (machine_size_s) => {
				var machine_size = parseInt(machine_size_s);
				rl.question("wrap-count: ", (wrap_count_s) => {
					var wrap_count = parseInt(wrap_count_s);
					rl.question("input-file: ", (input_file_path) => {
						rl.question("output-file: ", (output_file_path) => {

							var file_buffer = fs.readFileSync(file);
							var input_file_stream = byte_stream_to_binary_stream(buffer_to_stream(fs.readFileSync(input_file_path)));
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
							var byte_stream = binary_stream_to_byte_stream(padded_stream);
							var buf = byte_stream_to_byte_buffer(byte_stream);

							fs.writeFileSync(output_file_path, buf);

							rl.close();
						});
					});
				});
			});
		});
	});
});

