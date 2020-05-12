
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

	function read_chosen_bit(shift) {
		return read_bit_and_skip_range(shift, max_shift);
	}

	function step (read_tape_bit, memory_tape_bit) {
		var shift = 1 * read_tape_bit + 2 * memory_tape_bit + 4 * key_tape(); // a "chooser"

		var wt_bit = read_chosen_bit(shift);
		var wt_skip = read_chosen_bit(shift);
		var mem_bit = read_chosen_bit(shift);
		var mem_direction_bit = read_chosen_bit(shift);

		machine_pos = (machine_pos + shift * diff_accumulator) % machine_len;
		if (diff_accumulator > (max_shift + 1) && shift == 0) {
			diff_accumulator -= max_shift + 1;
		} else {
			diff_accumulator++;
		}

		return {
			new_write_tape_bit: wt_bit, // : {0 ,1}
			skip_write: wt_skip, // : {0 ,1}
			new_memory_tape_bit: mem_bit, // : {0 ,1}
			memory_tape_direction_bit: mem_direction_bit, // : {0, 1}
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
		var memory_tape_bit = double_bitarray_at_or_x(memory_tape, memory_tape_pos, weak_rng());
		var ret = tm(read_tape_bit, memory_tape_bit);

		double_bitarray_set_bit_extend0(memory_tape, memory_tape_pos, ret.new_memory_tape_bit);
		read_tape_pos++;
		memory_tape_pos += ret.memory_tape_direction_bit * 2 - 1;

		if (ret.skip_write == 0) {
			write_tape_pos += ret.skip_write_tape_bit;
			bitarray_set_bit_extend0(write_tape, write_tape_pos, ret.new_write_tape_bit);
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
