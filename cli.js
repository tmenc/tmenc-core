
var readline = require("readline");
var fs = require("fs");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: false,
});

rl.question('pass: ', (pass) => {
	rl.question("file: ", (file) => {

		var file_buffer = fs.readFileSync(file);
		var file_stream = byte_stream_to_binary_stream(buffer_to_byte_stream(file_buffer));
		var file_vector = stream_to_vector(file_stream);
		console.log("len:", file_vector.length, "bytes:", file_vector);
		// var nums = ascii_to_binary(pass);
		// console.log(nums);

		rl.close();
	});
});

