
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

function double_tape_create(value) {
	return {
		me: {
			current: value,
			left: null,
			right: null,
		}
	};
}

function double_tape_move_left(tape, default_value) {
	if (tape.me.left) {
		tape.me = tape.me.left;
	} else {
		tape.me = {
			current: default_value,
			left: null,
			right: tape.me,
		}
	}
}

function double_tape_move_right(tape, default_value) {
	if (tape.me.right) {
		tape.me = tape.me.right;
	} else {
		tape.me = {
			current: default_value,
			left: tape.me,
			right: null,
		}
	}
}

function double_tape_get(tape) {
	return tape.me.value;
}

function double_tape_set(tape, value) {
	tape.me.value = value;
}

function make_tm(machine_bits) {
	var machine_len = bitarray_length(machine_bits);
	var machine_pos = 0;

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
		var jump_size = (1 + read_tape_bit) * (1 + memory_tape_register);

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

function make_tm_env(machine_bits, input_bits) {
	var tm = make_tm(machine_bits);

	var memory_tape = double_tape_create(0);
	var read_tape_len = bitarray_length(input_bits);
	var read_tape = input_bits;
	var read_tape_pos = 0;

	return function() {
		while (true) {
			var read_tape_bit = bitarray_at(read_tape, read_tape_pos);
			var memory_tape_register = double_tape_get(memory_tape);
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

			double_tape_set(memory_tape, new_register_value);
			if (ret.direction_bit == 0) {
				double_tape_move_left(memory_tape, 0);
			} else {
				double_tape_move_right(memory_tape, 0);
			}

			if (read_tape_pos >= read_tape_len) {
				read_tape_pos = 0;
			}

			if (ret.wt_skip == 0) {
				return ret.wt_bit;
			}
		}
	};
}
