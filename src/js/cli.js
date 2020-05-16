
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
			rl.question("machine-size: ", (machine_size_s) => {
				var machine_size = parseInt(machine_size_s);
				rl.question("key-size: ", (key_size_s) => {
					var key_size = parseInt(key_size_s);
					rl.question("wrap-count: ", (wrap_count_s) => {
						var wrap_count = parseInt(wrap_count_s);

						var key = make_key(pass, salt, file, key_size, machine_size, wrap_count);
						debug_vec(key)

						rl.close();
					});
				});
			});
		});
	});
});

