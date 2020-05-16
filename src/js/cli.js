
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

rl.question('pass: ', (pass) => {
	rl.question("salt: ", (salt) => {
		rl.question("keyfile: ", (file) => {
			var key = make_key(pass, salt, file, 100, 999, 3);

			debug_vec(key)

			rl.close();
		});
	});
});

