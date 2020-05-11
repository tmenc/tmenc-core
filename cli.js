
var readline = require("readline");
var util = require("./util.js");

var rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

rl.question('pass: ', (pass) => {
	rl.question("file: ", (file) => {

		var nums = util.ascii_to_binary(pass);
		console.log(nums);

		rl.close();
	});
});

