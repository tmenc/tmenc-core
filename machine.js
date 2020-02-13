
function bitarray_at_or0(bitarr, at) {
	if (at >= 0 && at < bitarr.length) {
		return bitarr[at];
	} else {
		return 0;
	}
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

// function bitarray_swap(bitarr, x, y) {
// 	const t = bitarr[x];
// 	bitarr[x] = bitarr[y];
// 	bitarr[y] = t;
// }

function bitarray_swap0(bitarr, x, y) {
	const t = bitarray_at_or0(bitarr, x);
	bitarray_set_or_nop(bitarr, x, bitarray_at_or0(bitarr, y))
	bitarray_set_or_nop(bitarr, y, t);
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
function number_to_bitarray64(num) {
	var arr = bitarray_alloc(64);
	var i = 0;
	while (num > 1) {
		if (i >= 64) {
			throw "number is bigger than 2^64";
		}
		bitarr_set_bit(arr, i, num % 2);
		i++;
		num = Math.floor(num / 2);
	}

	while (i < 64) {
		arr[i] = 1;
		i++;
	}

	console.log("COUNT =", biarr.length);

	return arr;
}

// 64 bits only!
function init_simple_rng(seed) {
	x = seed;
	mask = Math.pow(2, 64) - 1;
	return function () {
		x ^= (x << 21);
		x ^= (x >> 35);
		x ^= (x << 4);
		return Math.abs(x);
	}
}

x = 73;
console.log("x = ", x);
a = number_to_bitarray64(x);
console.log("a = ", a);

