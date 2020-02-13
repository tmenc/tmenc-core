
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

