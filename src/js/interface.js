
function make_key(pass, salt, file, size) {
	var file_buffer = fs.readFileSync(file);
	var file_stream = byte_stream_to_binary_stream(buffer_to_byte_stream(file_buffer));
	var pass_stream = hex_to_binary_stream(pass);
	var salt_stream = hex_to_binary_stream(salt); // usually get from prev version

	var combined_input = append_streams([pass_stream, file_stream]);

	var machine_bits = stream_to_bitarr(salt);
	var input_bits = stream_to_bitarr(combined_input);
	var tm_env = make_tm_env(machine_bits, input_bits, size);


