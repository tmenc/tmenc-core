
function bitarray_length(bitarr) {
	return bitarr.length;
}

function bitarray_at_or0(bitarr, at) {
	if (at >= 0 && at < bitarr.length) {
		return bitarr[at];
	} else {
		return 0;
	}
}

function bitarray_extend_with0(bitarr, newlen) {
	for (var i = bitarray_length(bitarr); i < newlen; i++) {
		bitarr.push(0);
	}
}

function bitarray_at(bitarr, at) {
	return bitarr[at];
}

function bitarray_alloc(bits) {
	return new Array(bits);
}

function bitarray_set_bit(bitarr, i, value) {
	bitarr[i] = value;
}

function bitarray_set_bit_or_nop(bitarr, i, value) {
	if (i >= 0 && i < bitarr.length) {
		bitarr[i] = value;
		return true;
	} else {
		return false;
	}
}

function bitarray_set_bit_extend0(bitarr, i, value) {
	if (bitarray_set_bit_or_nop(bitarr, i, value)) {
		return true;
	} else {
		bitarray_extend_with0(bitarr, i + 1);
		bitarray_set_bit(bitarr, i, value);
		return false;
	}
}

function bitarray_copy(x) {
	var len = bitarray_length(x);
	var ret = bitarray_alloc(len);
	for (var i = 0; i < len; i++) {
		bitarray_set_bit(ret, i, bitarray_at(x, i));
	}
	return ret;
}

// function bitarray_swap(bitarr, x, y) {
// 	var t = bitarr[x];
// 	bitarr[x] = bitarr[y];
// 	bitarr[y] = t;
// }

function bitarray_swap0(bitarr, x, y) {
	var t = bitarray_at_or0(bitarr, x);
	bitarray_set_bit_or_nop(bitarr, x, bitarray_at_or0(bitarr, y))
	bitarray_set_bit_or_nop(bitarr, y, t);
}

/// [1, 0, 0, 1, 0] >> 1
/// [0, 1, 0, 0, 1]

function bitarray_shift_right(bitarr, dx) {
	var len = bitarray_length(bitarr);
	if (dx > 0) {
		for (var i = len - 1; i >= 0; i--) {
			bitarray_swap0(bitarr, i, i + dx);
		}
	} else {
		for (var i = 0; i < len; i++) {
			bitarray_swap0(bitarr, i, i + dx);
		}
	}
	return bitarr;
}

function bitarray_shift_left(bitarr, dx) {
	return bitarray_shift_right(bitarr, -dx);
}

// DOES NOT REPRESENT NUMBER IN BINARY!
function number_to_bitarray(num, bits) {
	var arr = bitarray_alloc(bits);
	var i = 0;
	while (num > 1) {
		if (i >= bits) {
			throw ("number is bigger than 2^" + bits);
		}
		bitarray_set_bit(arr, i, num % 2);
		i++;
		num = Math.floor(num / 2);
	}

	while (i < bits) {
		bitarray_set_bit(arr, i, 1);
		i++;
	}

	return arr;
}

function bitarray_xor_with(target, other) {
	var lent = bitarray_length(target);
	var leno = bitarray_length(other);
	var len = lent < leno ? lent : leno;
	for (var i = 0; i < len; i++) {
		var x = bitarray_at(target, i);
		var y = bitarray_at(other, i);
		bitarray_set_bit(target, i, x ^ y);
	}
}

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

function make_tm(machine_bits, weak_rng, key_tape) {
	var machine_len = bitarray_length(machine_bits);
	var max_shift = 1 * 1 + 2 * 1 + 4 * 1;
	var machine_pos = 0;
	var diff_accumulator = 1; // makes cycles less probable

	function read_bit_and_skip_range(shift, range) {
		var bit_pos = (machine_pos + shift) % machine_len;
		var bit = bitarray_at(machine_bits, bit_pos) ^ weak_rng();
		machine_pos += range + 1; // skip range bits
		machine_pos = machine_pos % machine_len; // overflow protection
		return bit;
	}

	function read_1_bit() {
		return read_bit_and_skip_range(0, 0);
	}

	function read_chosen_bit(shift) {
		return read_bit_and_skip_range(shift, max_shift);
	}

	function read_n_collapse(ratio_a, sum, shift) {
		var acc = 0;
		for (var i = 0; i < sum; i++) {
			acc += read_chosen_bit(shift);
		}

		if (acc >= ratio_a) {
			return 1;
		} else {
			return 0;
		}
	}

	function step (read_tape_bit, write_tape_bit) {
		var shift = 1 * read_tape_bit + 2 * write_tape_bit + 4 * key_tape(); // a "chooser"

		var wt_bit = read_chosen_bit(shift);
		var rt_direction_bit = read_n_collapse(1, 2, shift); // 1,1 = 50% | 1,2 = 75% | 1,3 = 87% | 2,2 = 25% | 2,3 = 50% | 3,3 = 12%
		var wt_direction_bit = read_n_collapse(1, 2, shift); // 1,1 = 50% | 1,2 = 75% | 1,3 = 87% | 2,2 = 25% | 2,3 = 50% | 3,3 = 12%

		var rt_direction = rt_direction_bit * 2 - 1;
		var wt_direction = wt_direction_bit * 2 - 1;

		machine_pos = (machine_pos + shift * diff_accumulator) % machine_len;
		if (diff_accumulator > max_shift && shift == 0) {
			diff_accumulator -= max_shift;
		} else {
			diff_accumulator++;
		}

		return {
			new_write_tape_bit: wt_bit, // : {0 ,1}
			read_tape_direction: rt_direction, // : {-1, 1}
			write_tape_direction: wt_direction, // : {-1, 1}
		};
	}
	return step;
}

function make_tm_env(machine_bits, input_bits, weak_rng, key_tape, write_tape_size_limit) {
	var tm = make_tm(machine_bits, weak_rng, key_tape);
	var read_tape_len = bitarray_length(input_bits);
	var read_tape = input_bits;
	var write_tape = bitarray_alloc(0);
	var read_tape_pos = 0;
	var write_tape_pos = 0;
	var write_tape_wrap_count = 0;
	var read_tape_wrap_count = 0;
	var read_tape_read_all = false;
	function step() {
		var read_tape_bit = bitarray_at_or0(read_tape, read_tape_pos);
		var write_tape_bit = bitarray_at_or0(write_tape, write_tape_pos);
		var ret = tm(read_tape_bit, write_tape_bit);

		if (write_tape_size_limit) {
			if (write_tape_pos >= write_tape_size_limit) {  // ASSUMPTION: write_tape_pos changes by 1 on each step
				write_tape_pos = 0;
				if (read_tape_read_all) {
					write_tape_wrap_count++;
				}
			} else if (write_tape_pos < 0) {
				write_tape_pos = write_tape_size_limit - 1;
				if (read_tape_read_all) {
					write_tape_wrap_count--;
				}
			}
		} else if (write_tape_pos < 0) {
			write_tape_pos = 0; // TODO: make left-infinite also!
		}

		bitarray_set_bit_extend0(write_tape, write_tape_pos, ret.new_write_tape_bit);
		read_tape_pos += ret.read_tape_direction;
		write_tape_pos += ret.write_tape_direction;

		if (read_tape_pos >= read_tape_len) {
			read_tape_pos = 0;
			read_tape_wrap_count++;
			if (read_tape_wrap_count == 1) {
				read_tape_read_all = true;
			}
		} else if (read_tape_pos < 0) {
			read_tape_pos = read_tape_len - 1;
			read_tape_wrap_count--;
			if (read_tape_wrap_count == -2) {
				read_tape_read_all = true;
			}
		}
	}
	return {
		step: step,
		write_tape: write_tape,
		write_tape_wrap_count: function () { return write_tape_wrap_count; },
		read_tape_read_all: function () { return read_tape_read_all; },
	};
}

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

function test_tm_hashing() {
	function finished(env, wc) {
		return env.read_tape_read_all() && env.write_tape_wrap_count() > wc;
	}
	function dotest(singleflip, input_size, machine_size, wr_tape_size, wrap_count) {
		var machine_bits = generate_n_weak_random_bits(200, machine_size);
		var input_bits = generate_n_weak_random_bits(300, input_size);
		var env = make_default_tm_env(machine_bits, input_bits, 777, wr_tape_size);
		var step = env.step;
		var write_tape = env.write_tape;

		while (!(finished(env, wrap_count))) {
		// for (var i = 0; i < 100000; i++) {
			step();
		}

		var input_bits2 = bitarray_copy(input_bits);
		if (singleflip) {
			var len = bitarray_length(input_bits2);
			var change_pos = len - 32;
			bitarray_set_bit(input_bits2, change_pos, 1 ^ bitarray_at(input_bits2, change_pos));
		} else {
			for (var i = 0; i < bitarray_length(input_bits2); i++) {
				bitarray_set_bit(input_bits2, i, 1 ^ bitarray_at(input_bits2, i));
			}
		}

		var env2 = make_default_tm_env(machine_bits, input_bits2, 777, wr_tape_size);
		var step2 = env2.step;
		var write_tape2 = env2.write_tape;

		while (!(finished(env2, wrap_count))) {
		// for (var i = 0; i < 100000; i++) {
			step2();
		}

		for (var i = 0; i < bitarray_length(write_tape); i++) {
			console.log(bitarray_at(write_tape, i));
		}

		// console.log('input1: ', input_bits);
		// console.log('input2: ', input_bits2);
		// console.log('tape1: ', write_tape);
		// console.log('tape2: ', write_tape2);
		return vectors_same_bits_ratio(write_tape, write_tape2);
	}

	var start = 1000009;
	var times = 1;
	var sum = 0;
	for (var i = 0; i < times; i++) {
		console.log('wt size = ', start + i);
		var ratio = dotest(true, 10000, 1000, start + i, 1);
		var dd = ratio > 0.9 ? 1 : 0;
		sum += dd;
		console.log('ratio = ', ratio);
	}
	console.log('score = ', sum / times);
}

function generate_example_key() {
	var machine_size = 1000;
	var input_size = 10000;
	var wr_tape_size = 100000;
	var wrap_count = 2;

	function finished(env, wc) {
		return env.read_tape_read_all() && env.write_tape_wrap_count() > wc;
	}

	var machine_bits = generate_n_weak_random_bits(200, machine_size);
	var input_bits = generate_n_weak_random_bits(300, input_size);
	var env = make_default_tm_env(machine_bits, input_bits, 777, wr_tape_size);
	var step = env.step;
	var write_tape = env.write_tape;

	while (!(finished(env, wrap_count))) {
		step();
	}

	for (var i = 0; i < bitarray_length(write_tape); i++) {
		console.log(bitarray_at(write_tape, i));
	}
}

// test_tm();
// test_tm2();
// test_tm_hashing();
generate_example_key();

