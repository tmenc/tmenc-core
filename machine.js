
function bitarray_at_or0(bitarr, at) {
	if (at >= 0 && at < bitarr.length) {
		return bitarr[at];
	} else {
		return 0;
	}
}

// function bitarray_swap(bitarr, x, y) {
// 	const t = bitarr[x];
// 	bitarr[x] = bitarr[y];
// 	bitarr[y] = t;
// }

function bitarray_swap0(bitarr, x, y) {
	const t = bitarray_at_or0(bitarr, x);
	if (x >= 0 && x < bitarr.length) {
		bitarr[x] = bitarray_at_or0(bitarr, y);
	}
	if (y >= 0 && y < bitarr.length) {
		bitarr[y] = t;
	}
}

/// [1, 0, 0, 1, 0] >> 1
/// [0, 1, 0, 0, 1]

function bitarray_shift_right(bitarr, dx) {
	const len = bitarr.length;
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

// this function has specific endianess, not sure which
// but dont care about it please
function number_to_bitarray64(num) {
	var arr = [];
	var count = 0;
	while (num > 1) {
		if (count > 64) {
			throw "number is bigger than 2^64";
		}
		arr.push(num % 2);
		num = Math.floor(num / 2);
		count++;
	}

	while (count < 64) {
		arr.push(1);
		count++;
	}

	console.log("COUNT =", arr.length);

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

