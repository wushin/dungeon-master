module.exports = (function() {
	// These codes are used in the close event
	// Permissable values are between 4000 -> 4999
	// https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
	var codes = {};

	codes.SERVER_FULL = 4001;

	return codes;
})();
