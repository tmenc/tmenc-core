
var readline = require("readline");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.question('pass: ', (pass) => {
	rl.question("file: ", (file) => {

		var nums = ascii_to_binary(pass);
		console.log(nums);

		rl.close();
	});
});

