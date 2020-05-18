
function bitarray_length(bitarr) {
	return bitarr.length;
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

var DOUBLE_TAPE_DEFAULT_VALUE = 0;

function double_tape_create() {
	return {
		me: {
			current: DOUBLE_TAPE_DEFAULT_VALUE,
			left: null,
			right: null,
		}
	};
}

function double_tape_move_left(tape) {
	if (tape.me.left == null) {
		tape.me.left = {
			current: DOUBLE_TAPE_DEFAULT_VALUE,
			left: null,
			right: tape.me,
		}
	}
	tape.me = tape.me.left;
}

function double_tape_move_right(tape, default_value) {
	if (tape.me.right == null) {
		tape.me.right = {
			current: DOUBLE_TAPE_DEFAULT_VALUE,
			left: tape.me,
			right: null,
		}
	}
	tape.me = tape.me.right;
}

function double_tape_get(tape) {
	return tape.me.current;
}

function double_tape_set(tape, value) {
	tape.me.current = value;
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

	function machine_flip_and_read() {
		var new_bit = 1 ^ machine_read();
		bitarray_set_bit(machine_bits, machine_pos, new_bit);
		return new_bit;
	}

	function machine_step (read_tape_bit, memory_tape_register) {
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
	return machine_step;
}

function make_tm_env(machine_bits, input_stream) {
	var tm = make_tm(machine_bits);
	var memory_tape = double_tape_create();

	return function() {
		while (true) {
			var read_tape_bit = input_stream();
			var memory_tape_register = double_tape_get(memory_tape);
			var ret = tm(read_tape_bit, memory_tape_register);

			if (ret.increment_dir == 0 && memory_tape_register <= 0) {
				ret.increment_bit = 0;
			}

			var new_register_value = undefined;
			if (ret.increment_dir == 0) {
				new_register_value = memory_tape_register - ret.increment_bit;
			} else {
				new_register_value = memory_tape_register + ret.increment_bit;
			}
			double_tape_set(memory_tape, new_register_value);

			if (ret.direction_bit == 0) {
				double_tape_move_left(memory_tape);
			} else {
				double_tape_move_right(memory_tape);
			}

			if (ret.wt_skip == 0) {
				return ret.wt_bit;
			}
		}
	};
}
