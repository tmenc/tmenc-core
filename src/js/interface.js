
// NOTE: `wrap_count' should depend on `length(pass++file)'
// salt should to be different for each key!
function make_key(pass, salt, file, size, machine_size, wrap_count) {
	var pass_stream = hex_to_binary_stream(pass);
	var salt_stream = hex_to_binary_stream(salt);
	var file_buffer = fs.readFileSync(file);
	var file_v = stream_to_vector(byte_stream_to_binary_stream(buffer_to_byte_stream(file_buffer)));
	var file_stream = vector_to_stream(file_v);

	var pass_v = stream_to_vector(hex_to_binary_stream(pass));
	var salt_v = stream_to_vector(hex_to_binary_stream(salt));
	var machine_bits = make_machine_from_secret(pass_v, salt_v, file_v, machine_size);

	var input_stream = append_streams([pass_stream, salt_stream, file_stream]);
	var input_bits = stream_to_bitarr(input_stream);

	var env = make_tm_env(machine_bits, input_bits, size);
	tm_run_for_wc(env, wrap_count);

	return env.write_tape;
}

