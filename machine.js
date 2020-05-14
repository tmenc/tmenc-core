
var MAX = 0;

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

function bitarray_at_or_x(bitarr, at, x) {
	if (at >= 0 && at < bitarr.length) {
		return bitarr[at];
	} else {
		return x;
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

function double_bitarray_create() {
	return {
		left_part: bitarray_alloc(0),
		right_part: bitarray_alloc(0),
	};
}

function double_bitarray_at_or_x(dbitarr, at, x) {
	var target = at < 0 ? dbitarr.left_part : dbitarr.right_part;
	var abs_at = at < 0 ? -at : at;
	return bitarray_at_or_x(target, abs_at, x);
}

function double_bitarray_set_bit_extend0(dbitarr, at, value) {
	var target = at < 0 ? dbitarr.left_part : dbitarr.right_part;
	var abs_at = at < 0 ? -at : at;
	return bitarray_set_bit_extend0(target, abs_at, value);
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

function make_tm(machine_bits, weak_rng, key_tape) {
	var machine_len = bitarray_length(machine_bits);
	var machine_pos = 0;
	var flip_flop = 0;

	function machine_advance(by) {
		machine_pos = (machine_pos + by) % machine_len;
	}

	function machine_read() {
		return bitarray_at(machine_bits, machine_pos);
	}

	function machine_flip_current_bit() {
		var new_bit = 1 ^ machine_read();
		bitarray_set_bit(machine_bits, machine_pos, new_bit);
		return new_bit;
	}

	function machine_flip_and_read() {
		return machine_flip_current_bit();
	}

	function step (read_tape_bit, memory_tape_register) {
		var jump_size = 1 + (1 + read_tape_bit) * memory_tape_register;

		// console.log('read:', read_tape_bit);
		// console.log('jump:', jump_size);

		var wt_skip = machine_flip_and_read();
		machine_advance(jump_size);

		var wt_bit = machine_flip_and_read();
		machine_advance(jump_size);

		var increment_bit = machine_flip_and_read();
		machine_advance(jump_size);
		var increment_dir = machine_flip_and_read();
		machine_advance(jump_size);
		var direction_bit = machine_flip_and_read();
		machine_advance(jump_size);

		return {
			wt_bit: wt_bit,
			wt_skip: wt_skip,
			increment_bit: increment_bit,
			increment_dir: increment_dir,
			direction_bit: direction_bit,
		};
	}
	return step;
}

function make_tm_env(machine_bits, input_bits, weak_rng, key_tape, write_tape_size_limit) {
	var tm = make_tm(machine_bits, weak_rng, key_tape);

	var memory_tape = double_bitarray_create();
	var read_tape_len = bitarray_length(input_bits);
	var read_tape = input_bits;
	var write_tape = bitarray_alloc(0);
	var memory_tape_pos = 0;
	var read_tape_pos = 0;
	var write_tape_pos = 0;

	var write_tape_wrap_count = 0;
	var read_tape_wrap_count = 0;
	var read_tape_read_all = false;
	function step() {
		var read_tape_bit = bitarray_at(read_tape, read_tape_pos);
		var memory_tape_register = double_bitarray_at_or_x(memory_tape, memory_tape_pos, 0);
		var ret = tm(read_tape_bit, memory_tape_register);

		read_tape_pos++;

		var increment_dir_factor = ret.increment_dir * 2 - 1;
		var new_register_value =
			memory_tape_register +
			increment_dir_factor *
			ret.increment_bit;
		if (new_register_value < 0) {
			new_register_value = 0;
		}

		double_bitarray_set_bit_extend0(
			memory_tape,
			memory_tape_pos,
			new_register_value);
		memory_tape_pos += ret.direction_bit * 2 - 1;

		// console.log('wt_bit:', ret.wt_bit);
		// console.log('wt_skip:', ret.wt_skip);

		if (MAX < memory_tape_register) {
			MAX = memory_tape_register;
			// console.log("MAX:", MAX);
			// console.log(memory_tape);
		}

		// if (MAX < memory_tape_pos) {
		// 	MAX = memory_tape_pos;
		// 	console.log("MAX:", MAX);
		// }

		if (ret.wt_skip == 0) {
			bitarray_set_bit_extend0(write_tape, write_tape_pos, ret.wt_bit);
			write_tape_pos++;
		}

		if (read_tape_pos >= read_tape_len) {
			read_tape_pos = 0;
			read_tape_wrap_count++;
			if (read_tape_wrap_count == 1) {
				read_tape_read_all = true;
			}
		}

		if (write_tape_size_limit) {
			if (write_tape_pos >= write_tape_size_limit) {
				write_tape_pos = 0;
				if (read_tape_read_all) {
					write_tape_wrap_count++;
				}
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
