
var readline = require("readline");
var fs = require("fs");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
});

rl.question('pass: ', (pass) => {
	rl.question("file: ", (file) => {
		rl.question("salt: ", (salt) => {

			var file_buffer = fs.readFileSync(file);
			var file_stream = byte_stream_to_binary_stream(buffer_to_byte_stream(file_buffer));
			var pass_stream = ascii_to_binary_stream(pass);
			var salt_stream = ascii_to_binary_stream(salt); // usually get from prev version

			var combined = append_streams([salt_stream, pass_stream, file_stream]);

			console.log('vec:', stream_to_vector(combined));

			rl.close();
		});
	});
});

