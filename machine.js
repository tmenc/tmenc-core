
function bitarray_at_or0(bitarr, at) {
	if (at >= 0 && at < bitarr.length) {
		return bitarr[at];
	} else {
		return 0;
	}
}

function bitarray_at(bitarr, at) {
	return bitarr[at];
}

function bitarray_alloc(bits) {
	return new Array(bits);
}

function bitarray_set_bit_or_nop(bitarr, i, value) {
	if (i >= 0 && i < bitarr.length) {
		bitarr[i] = value;
	}
}

function bitarray_set_bit(bitarr, i, value) {
	bitarr[i] = value;
}

function bitarray_length(bitarr) {
	return bitarr.length;
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

// 64 bits only!
function init_simple_rng_ref(seed) {
	var x = seed;
	const mask = 4294967295;
	return function () {
		x ^= (x << 13) & mask;
		x ^= (x >> 17) & mask;
		x ^= (x << 5) & mask;
		return x;
	};
}

function init_simple_rng(seed) {
	var x = number_to_bitarray(seed, 32);
	return function () {
		const a = bitarray_shift_left(bitarray_copy(x), 13);
		bitarray_xor_with(x, a);
		const b = bitarray_shift_right(bitarray_copy(x), 17);
		bitarray_xor_with(x, b);
		const c = bitarray_shift_left(bitarray_copy(x), 5);
		bitarray_xor_with(x, c);
		return bitarray_copy(x);
	};
}

x = 73;
console.log("x = ", x);
a = number_to_bitarray(x, 32);
console.log("a = ", a);

var rng = init_simple_rng(21923123);

for (var i = 0; i < 30; i++) {
	console.log(rng()[4]);
}

rng = init_simple_rng_ref(21923123);

for (var i = 0; i < 30; i++) {
	console.log(rng());
}

