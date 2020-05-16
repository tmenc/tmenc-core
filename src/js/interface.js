
// NOTE: `wrap_count' should depend on `length(pass++file)'
function make_key(pass, machine_bits_hex, file, size, wrap_count) {
	var file_buffer = fs.readFileSync(file);
	var file_stream = byte_stream_to_binary_stream(buffer_to_byte_stream(file_buffer));
	var pass_stream = hex_to_binary_stream(pass);
	var mach_stream = hex_to_binary_stream(machine_bits_hex); // usually get from prev version

	var input_stream = append_streams([pass_stream, file_stream]);

	var machine_bits = stream_to_bitarr(mach_stream);
	var input_bits = stream_to_bitarr(input_stream);
	var env = make_tm_env(machine_bits, input_bits, size);
	tm_run_for_wc(env, wrap_count);

	return env.write_tape;
}

