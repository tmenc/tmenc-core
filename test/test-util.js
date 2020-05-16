
// works on uint32_t
function init_simple_rng_ref(seed) {
	var x = seed;
	var mod = 4294967296; // 2 ^ 32
	function to1bit (z) {
		if (z > 2147483648) { return 1; }
		else { return 0; }
	}
	return function () {
		x = (((x * 1664525) % mod) + 1013904223) % mod;
		return to1bit(x);
	};
}

function generate_n_weak_random_bits(seed, n) {
	var rng = init_simple_rng_ref(seed);
	var ret = bitarray_alloc(n);
	for (var i = 0; i < n; i++) {
		bitarray_set_bit(ret, i, rng())
	}
	return ret;
}

function test_rng_ref() {
	var rng = init_simple_rng_ref(200);
	for (var i = 0; i < 10; i++) {
		console.log(rng());
	}
	// console.log(rng());
}

function default_key_tape() {
	return init_simple_rng_ref(72731);
	// return function () {
	// 	return 1;
	// };
}

function make_default_tm_env(machine_bits, input_bits, seed, write_tape_limit) {
	// var weak_rng = init_simple_rng_ref(seed);
	// var key_tape = default_key_tape();
	return make_tm_env(machine_bits, input_bits, write_tape_limit);
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


function make_random_tm_env(input_size, machine_size, wr_tape_size) {
	// machine_size = 1;

	var machine_bits = generate_n_weak_random_bits(200, machine_size);
	var input_bits = generate_n_weak_random_bits(300, input_size);
	var env = make_default_tm_env(machine_bits, input_bits, 777, wr_tape_size);

	// for (var i = 0; i < machine_size; i++) {
	// 	bitarray_set_bit(machine_bits, i, 1);
	// }

	return {
		machine_bits: machine_bits,
		input_bits: input_bits,
		env: env,
	};
}

function test_tm_hashing() {
	function dotest(singleflip, input_size, machine_size, wr_tape_size, wrap_count) {
		var first = make_random_tm_env(input_size, machine_size, wr_tape_size);
		var machine_bits = bitarray_copy(first.machine_bits);
		var env1 = first.env;
		tm_run_for_wc(env1, wrap_count);

		var input_bits2 = bitarray_copy(first.input_bits);
		if (singleflip) {
			var len = bitarray_length(input_bits2);
			var change_pos = len - 32;
			// var change_pos = 0;
			bitarray_set_bit(input_bits2, change_pos, 1 ^ bitarray_at(input_bits2, change_pos));
		} else {
			for (var i = 0; i < bitarray_length(input_bits2); i++) {
				bitarray_set_bit(input_bits2, i, 1 ^ bitarray_at(input_bits2, i));
			}
		}

		var env2 = make_default_tm_env(machine_bits, input_bits2, 777, wr_tape_size);
		tm_run_for_wc(env2, wrap_count);

		// for (var i = 0; i < bitarray_length(write_tape); i++) {
		// 	console.log(bitarray_at(write_tape, i));
		// }

		// console.log('input1: ', input_bits);
		// console.log('input2: ', input_bits2);
		// console.log('tape1: ', write_tape);
		// console.log('tape2: ', write_tape2);
		return vectors_same_bits_ratio(env1.write_tape, env2.write_tape);
	}

	var max = 0;
	var min = 1;
	var start = 512;
	var times = 100;
	var sum = 0;
	for (var i = 0; i < times; i++) {
		console.log('wt size = ', start + i);
		var ratio = dotest(true, 100000, 1000, start + i, 0);
		sum += ratio;
		if (ratio > max) {
			max = ratio;
		}
		if (ratio < min) {
			min = ratio;
		}
		console.log('ratio = ', ratio);
	}

	var avg = sum / times;
	console.log('avg = ', avg);
	console.log('min = ', min);
	console.log('max = ', max);

	if (avg > 0.55 || avg < 0.45) {
		throw "BAD AVERAGE";
	}
	if (max > 0.8) {
		throw "MAX IS TOO HIGH";
	}
	if (min < 0.2) {
		throw "MIN IS TOO LOW";
	}
}

function generate_example_key() {
	var machine_size   =      1000;
	var input_size     =      1000;
	var wr_tape_size   =   5000000;
	var wrap_count     =         3;

	var env_x = make_random_tm_env(input_size, machine_size, wr_tape_size);
	var env = env_x.env;
	tm_run_for_wc(env, wrap_count);

	var n = bitarray_length(env.write_tape);
	for (var i = 0; i < n; i++) {
		console.log(bitarray_at(env.write_tape, i));
	}
}

function generate_weak_rng_test() {
	var rng = init_simple_rng_ref(777);
	var n = 5 * 1000 * 1000;
	for (var i = 0; i < n; i++) {
		console.log(rng());
	}
}
