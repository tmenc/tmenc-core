
function bytes_to_utf8(bytes) {
	var result = [], pos = 0, cr = 0;
	while (pos < bytes.length) {
		var c1 = bytes[pos++];
		if (c1 < 128) {
			result[cr++] = String.fromCharCode(c1);
		} else if (c1 > 191 && c1 < 224) {
			var c2 = bytes[pos++];
			result[cr++] = String.fromCharCode((c1 & 31) << 6 | c2 & 63);
		} else if (c1 > 239 && c1 < 365) {
			var c2 = bytes[pos++];
			var c3 = bytes[pos++];
			var c4 = bytes[pos++];
			var u = ((c1 & 7) << 18 | (c2 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 0x10000;
			result[cr++] = String.fromCharCode(0xD800 + (u >> 10));
			result[cr++] = String.fromCharCode(0xDC00 + (u & 1023));
		} else {
			var c2 = bytes[pos++];
			var c3 = bytes[pos++];
			result[cr++] = String.fromCharCode((c1 & 15) << 12 | (c2 & 63) << 6 | c3 & 63);
		}
	}
	return result.join('');
}

function show_cb(sourceName) {
	return function (buf) {
		var out_string = bytes_to_utf8(buf);
		var re = new RegExp('(\r|\n)', 'g');
		out_string = out_string.replace(re, '<br></br>');

		document.getElementById('main_out').innerHTML = out_string;
	}
}

function download_cb(sourceName) {
	return function (buf) {
		var props = {};
		if (sourceName.endsWith(".txt")) {
			props.type = 'text/plain';
		} else if (sourceName.endsWith(".json")) {
			props.type = 'application/json';
		} else if (sourceName.endsWith(".pdf")) {
			props.type = 'application/pdf';
		}

		var blob = new Blob(buf, props || undefined);
		var link = document.createElement('a');
		link.href = window.URL.createObjectURL(blob);
		link.download = sourceName;
		link.click();
	}
}

function read_keyfile_cb(output_cb, pass, keyfile_buffer, input_file_buffer) {
	decrypt(pass, keyfile_buffer, input_file_buffer, output_cb);
}

function read_input_file_cb(output_cb, input_filename) {
	return function (e) {
		var input_file_buffer = new Uint8Array(e.target.result);
		var pass = document.getElementById('pinput').value;

		var keyObject = document.getElementById('key_input');
		var files = keyObject.files; // FileList object
		var file = files[0];

		if (file) {
			var reader = new FileReader();
			reader.onload = function (e) {
				var keyfile_buffer = new Uint8Array(e.target.result);
				read_keyfile_cb(output_cb, pass, keyfile_buffer, input_file_buffer);
			}
			reader.readAsArrayBuffer(file);
		} else {
			read_keyfile_cb(output_cb, pass, new ArrayBuffer([]), input_file_buffer);
		}
	}
}

function handleClick(output_cb) {
	return function (button) {
		var targetObject = document.getElementById('encoded_input');
		var files = targetObject.files; // FileList object
		if (files.length <= 0) {
			alert('Choose target file!');
			return;
		}
		var file = files[0];

		console.log("FILE: ", {file});

		var reader = new FileReader();
		reader.onload = read_input_file_cb(output_cb(file.name));
		reader.readAsArrayBuffer(file);
	}
}

document.getElementById('show').addEventListener('click', handleClick(show_cb));
document.getElementById('download').addEventListener('click', handleClick(download_cb));
