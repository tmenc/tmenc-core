
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

							var buf = Buffer.alloc(key_size);

							for (var i = 0; i < key_size; i++) {
								buf[i] = key[i] ^ input_file_bits[i];
							}

							var byte_size = key_size / BLOCK_LEN;
							var bytes = byte_stream_to_byte_buffer(byte_size, binary_stream_to_byte_stream(buffer_to_stream(buf)));

							var salt_len = salt.length;
							var salt_len_stream = integer_to_binary_stream(32)(salt_len);

							fs.writeFileSync(output_file_path, bytes);

							rl.close();
						});
					});
				});
			});
		});
	});
});

