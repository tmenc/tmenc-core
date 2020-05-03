
function default_key_tape() {
	return init_simple_rng_ref(72731);
	// return function () {
	// 	return 1;
	// };
}

function make_default_tm_env(machine_bits, input_bits, seed, write_tape_limit) {
	var weak_rng = init_simple_rng_ref(seed);
	var key_tape = default_key_tape();
	return make_tm_env(machine_bits, input_bits, weak_rng, key_tape, write_tape_limit);
}

function vectors_same_bits_ratio(v1, v2) {
	var l1 = bitarray_length(v1);
	var l2 = bitarray_length(v2);
	if (l1 != l2) {
		throw "vectors have to be of same size";
	}

	var count = 0;
	for (var i = 0; i < l1; i++) {
		count += bitarray_at(v1, i) ^ bitarray_at(v2, i);
	}

	var ratio = (l1 - count) / l1;
	return ratio;
}

function test_tm() {
	var machine_bits = [0];
	var input_bits = generate_n_weak_random_bits(300, 1);
	var env = make_default_tm_env(machine_bits, input_bits, 777);
	var step = env.step;
	var write_tape = env.write_tape;

	for (var i = 0; i < 100000; i++) {
		if (i % 1000 == 0) {
			console.log(write_tape);
		}
		step();
	}
}

function test_tm2() {
	var machine_bits = generate_n_weak_random_bits(200, 1 * 1000 * 1000);
	var input_bits = generate_n_weak_random_bits(300, 1 * 1000 * 1000);
	var env = make_default_tm_env(machine_bits, input_bits, 777, 1000);
	var step = env.step;
	var write_tape = env.write_tape;

	for (var i = 1; i <= 1000000; i++) {
		if (i % 1000 == 0) {
			console.log('steps: ', i, 'len: ', bitarray_length(write_tape));
		}
		step();
	}
}

function is_tm_finished(env, wc) {
	return env.read_tape_read_all() && env.write_tape_wrap_count() > wc;
}

function tm_env_generate_output(env, wrap_count) {
	var step = env.step;

	while (!(is_tm_finished(env, wrap_count))) {
		// for (var i = 0; i < 100000; i++) {
		step();
	}
}

function make_random_tm_env(input_size, machine_size, wr_tape_size) {
	var machine_bits = generate_n_weak_random_bits(200, machine_size);
	var input_bits = generate_n_weak_random_bits(300, input_size);
	var env = make_default_tm_env(machine_bits, input_bits, 777, wr_tape_size);

	return {
		machine_bits: machine_bits,
		input_bits: input_bits,
		env: env,
	};
}

function test_tm_hashing() {
	function dotest(singleflip, input_size, machine_size, wr_tape_size, wrap_count) {
		var first = make_random_tm_env(input_size, machine_size, wr_tape_size);
		var env1 = first.env;
		tm_env_generate_output(env1, wrap_count);

		var input_bits2 = bitarray_copy(first.input_bits);
		if (singleflip) {
			var len = bitarray_length(input_bits2);
			var change_pos = len - 32;
			bitarray_set_bit(input_bits2, change_pos, 1 ^ bitarray_at(input_bits2, change_pos));
		} else {
			for (var i = 0; i < bitarray_length(input_bits2); i++) {
				bitarray_set_bit(input_bits2, i, 1 ^ bitarray_at(input_bits2, i));
			}
		}

		var env2 = make_default_tm_env(first.machine_bits, input_bits2, 777, wr_tape_size);
		tm_env_generate_output(env2, wrap_count);

		// for (var i = 0; i < bitarray_length(write_tape); i++) {
		// 	console.log(bitarray_at(write_tape, i));
		// }

		// console.log('input1: ', input_bits);
		// console.log('input2: ', input_bits2);
		// console.log('tape1: ', write_tape);
		// console.log('tape2: ', write_tape2);
		return vectors_same_bits_ratio(env1.write_tape, env2.write_tape);
	}

	var start = 512;
	var times = 100;
	var sum = 0;
	for (var i = 0; i < times; i++) {
		console.log('wt size = ', start + i);
		var ratio = dotest(true, 100000, 1000, start + i, 10);
		var dd = ratio > 0.9 ? 1 : 0;
		sum += dd;
		console.log('ratio = ', ratio);
	}
	console.log('score = ', sum / times);
}

function generate_example_key() {
	var machine_size   =      1000;
	var input_size     =      1000;
	var wr_tape_size   =   5000000;
	var wrap_count     =         3;

	var env_x = make_random_tm_env(input_size, machine_size, wr_tape_size);
	var env = env_x.env;
	tm_env_generate_output(env, wrap_count);

	for (var i = 0; i < bitarray_length(env.write_tape); i++) {
		console.log(bitarray_at(env.write_tape, i));
	}
}

// test_tm();
// test_tm2();
test_tm_hashing();
// generate_example_key();


