
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
	const len = bitarray_length(x);
	const ret = bitarray_alloc(len);
	for (var i = 0; i < len; i++) {
		bitarray_set_bit(ret, i, bitarray_at(x, i));
	}
	return ret;
}

// function bitarray_swap(bitarr, x, y) {
// 	const t = bitarr[x];
// 	bitarr[x] = bitarr[y];
// 	bitarr[y] = t;
// }

function bitarray_swap0(bitarr, x, y) {
	const t = bitarray_at_or0(bitarr, x);
	bitarray_set_bit_or_nop(bitarr, x, bitarray_at_or0(bitarr, y))
	bitarray_set_bit_or_nop(bitarr, y, t);
}

/// [1, 0, 0, 1, 0] >> 1
/// [0, 1, 0, 0, 1]

function bitarray_shift_right(bitarr, dx) {
	const len = bitarray_length(bitarr);
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
	const arr = bitarray_alloc(bits);
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
		arr[i] = 1;
		i++;
	}

	console.log("COUNT =", arr.length);

	return arr;
}

function bitarray_xor_with(target, other) {
	const lent = bitarray_length(target);
	const leno = bitarray_length(other);
	const len = lent < leno ? lent : leno;
	for (var i = 0; i < len; i++) {
		const x = bitarray_at(target, i);
		bitarray_set_bit(target, i, x);
	}
}

// works on uint32_t
function init_simple_rng_ref(seed) {
	var x = seed;
	const mod = 4294967296; // 2 ^ 32
	function to1bit (z) {
		if (z > 2147483648) { return 1; }
		else { return 0; }
	}
	return function () {
		x = (((x * 1664525) % mod) + 1013904223) % mod;
		return to1bit(x);
	};
}

function make_tm(machine_bits, address_size) {
	const machine_len = machine_bits.length;
	const max_shift = 1 * 1 + 2 * 1;
	var machine_pos = 0;
	var diff_accumulator = 1; // makes cycles less probable

	function read_bit_and_skip_range(shift, range) {
		const bit_pos = (machine_pos + shift) % machine_len;
		const bit = bitarray_at(machine_bits, bit_pos);
		machine_pos += range + 1; // skip range bits
		machine_pos = machine_pos % machine_len; // overflow protection
		return bit;
	}
	function read_1_bit() {
		return read_bit_and_skip_range(0, 1);
	}
	function read_chosen_bit(shift) {
		return read_bit_and_skip_range(shift, max_shift);
	}
	function step (read_tape_bit, write_tape_bit) {
		const shift = 1 * read_tape_bit + 2 * write_tape_bit; // a "chooser"

		const wt_bit = read_chosen_bit(shift);
		const rt_direction_bit = read_chosen_bit(shift);
		const wt_direction_bit = read_chosen_bit(shift);

		const rt_direction = rt_direction_bit * 2 - 1;
		const wt_direction = rt_direction_bit * 2 - 1;

		machine_pos += shift * address_size; // jump to chosen address field
		var address_diff = 0;
		var pow = 1;
		for (var i = 0; i < address_size; i++) {
			const bit = read_1_bit();
			address_diff = new_address + bit * pow;
			pow = pow * 2;
		}

		machine_pos += address_diff;
		machine_pos += diff_accumulator;
		diff_accumulator++;

		return {
			new_write_tape_bit: wt_bit, // : {0 ,1}
			read_tape_direction: rt_direction, // : {-1, 1}
			write_tape_direction: wt_direction, // : {-1, 1}
		};
	}
	return step;
}

function make_tm_env(machine_bits, address_size, input_bits) {
	const tm = make_tm(machine_bits, address_size);
	const read_tape_len = input_bits.length;
	const read_tape = input_bits;
	const write_tape = bitarray_alloc(0);
	var read_tape_pos = 0;
	var write_tape_pos = 0;
	function step() {
		const read_tape_bit = bitarray_at_or0(read_tape, read_tape_pos);
		const write_tape_bit = bitarray_at_or0(write_tape, write_tape_pos);
		const ret = tm(read_tape_bit, write_tape_bit);
		bitarray_set_bit_extend0(write_tape, write_tape_pos, ret.new_write_tape_bit);
		read_tape_pos += ret.read_tape_direction;
		write_tape_pos += ret.write_tape_direction;

		if (read_tape_pos >= read_tape_len) {
			read_tape_pos = 0;
		} else if (read_tape_pos < 0) {
			read_tape_pos = read_tape_len - 1;
		}

		if (write_tape_pos < 0) {
			write_tape_pos = 0; // TODO: make left-infinite also!
		}
	}
	return {
		step: step,
		write_tape: write_tape,
	};
}

var rng = init_simple_rng_ref(200);

for (var i = 0; i < 10; i++) {
	console.log(rng());
}
console.log(rng());

