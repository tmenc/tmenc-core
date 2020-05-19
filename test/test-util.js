
function bitarray_copy(x) {
	var len = bitarray_length(x);
	var ret = bitarray_alloc(len);
	for (var i = 0; i < len; i++) {
		bitarray_set_bit(ret, i, bitarray_at(x, i));
	}
	return ret;
}

function generate_n_weak_random_bits(seed, n) {
	var rng = weak_rng_stream(seed);
	var ret = bitarray_alloc(n);
	for (var i = 0; i < n; i++) {
		bitarray_set_bit(ret, i, rng())
	}
	return ret;
}

function test_rng_ref() {
	var rng = weak_rng_stream(200);
	for (var i = 0; i < 10; i++) {
		console.log(rng());
	}
	// console.log(rng());
}

function make_default_tm_env(machine_bits, input_bits) {
	var input_cycle_stream = bitarr_to_cycle_stream(input_bits);
	return make_tm_env(machine_bits, input_cycle_stream);
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
	var stream = make_default_tm_env(machine_bits, input_bits);

	for (var i = 0; i < 100000; i++) {
		var x = stream();
		if (i % 1000 == 0) {
			console.log(x);
		}
	}
}

function make_random_tm_env(seed, input_size, machine_size) {
	// machine_size = 1;

	var machine_bits = generate_n_weak_random_bits(seed, machine_size);
	var input_bits = generate_n_weak_random_bits(seed + 1, input_size);
	var stream = make_default_tm_env(machine_bits, input_bits);

	// for (var i = 0; i < machine_size; i++) {
	// 	bitarray_set_bit(machine_bits, i, 1);
	// }

	return {
		machine_bits: machine_bits,
		input_bits: input_bits,
		stream: stream,
	};
}

function test_tm_hashing() {
	function dotest(singleflip, seed, input_size, machine_size, wr_tape_size, wrap_count) {
		var skip_count = input_size + wrap_count * wr_tape_size;
		var first = make_random_tm_env(seed, input_size, machine_size);
		var machine_bits = bitarray_copy(first.machine_bits);
		var stream1 = first.stream;
		var write_tape_1 = tm_get_stream_bitarr(stream1, input_size, wrap_count, wr_tape_size);

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

		var stream2 = make_default_tm_env(machine_bits, input_bits2);
		var write_tape_2 = tm_get_stream_bitarr(stream2, input_size, wrap_count, wr_tape_size);

		// for (var i = 0; i < bitarray_length(write_tape); i++) {
		// 	console.log(bitarray_at(write_tape, i));
		// }

		// console.log('input1: ', input_bits);
		// console.log('input2: ', input_bits2);
		// console.log('tape1: ', write_tape);
		// console.log('tape2: ', write_tape2);
		return vectors_same_bits_ratio(write_tape_1, write_tape_2);
	}

	var max = 0;
	var min = 1;
	var start = 512;
	var times = 100;
	var sum = 0;
	for (var i = 0; i < times; i++) {
		var ratio = dotest(true, i, 100000, 1000, start, 5);
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

	var env = make_random_tm_env(777, input_size, machine_size, wr_tape_size);
	var skip_count = input_size + wrap_count * wr_tape_size;
	var write_tape = tm_get_stream_bitarr(env.stream, input_size, wrap_count, wr_tape_size);

	var n = bitarray_length(write_tape);
	for (var i = 0; i < n; i++) {
		console.log(bitarray_at(write_tape, i));
	}
}

function generate_weak_rng_test() {
	var rng = weak_rng_stream(777);
	var n = 5 * 1000 * 1000;
	for (var i = 0; i < n; i++) {
		console.log(rng());
	}
}

function arr_equal(a, b) {
	if (a === b) { return true; }
	if (a.length != b.length) { return false; }

	for (var i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) { return false; }
	}

	return true;
}

function assert_arr_equal(a, b) {
	if (!(arr_equal(a, b))) {
		debugger;
		throw "ASSERT FAILED";
	}
}

function test_1_bit_byte_conversions() {
	var f0 = integer_to_binary_stream(8, 0);
	assert_arr_equal(stream_to_vector(f0), [0,0,0,0,0,0,0,0]);

	var f255 = integer_to_binary_stream(8, 255);
	assert_arr_equal(stream_to_vector(f255), [1,1,1,1,1,1,1,1]);
}

function test_bit_byte_conversions() {
	function byte_to_bit(vec) {
		var stream = vector_to_stream(vec);

		var bin_stream = byte_stream_to_binary_stream(stream);
		var bin = stream_to_vector(bin_stream);
		var byt_stream = binary_stream_to_byte_stream(vector_to_stream(bin));
		var byt = stream_to_vector(byt_stream);

		assert_arr_equal(vec, byt);
	}

	byte_to_bit([0, 255]);
	byte_to_bit([10, 20, 30, 225, 255, 0]);
	byte_to_bit([10, 20, 30, 225, 0, 255, 42]);

}
