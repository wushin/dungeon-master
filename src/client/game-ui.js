let UI = require('./ui/ui');

// Single static style module which manages the different UI layers
// Also manages specific Game UI - arguably these should be separate concerns
let GameUI = module.exports = (function() {
	let exports = {};

	let ui = null;				// Base UI Layer created on init
	let dialogUI = null; 	// Blocking UI Layer for dialogs

	exports.init = () => {
		ui = UI.create();
		dialogUI = UI.create({ blocking: true });
	};

	exports.initChat = (localId, sendMessage, onFocus, onBlur) => {
		exports.chat = ui.createChat({
			self: localId,
			sendMessage: sendMessage,
			width: 400,
			height: 400,	// TODO: fill height?
			right: 20,
			top: 20,
			onFocus: onFocus,
			onBlur: onBlur 
		});
	};

	exports.showDialog = (params) => {
		dialogUI.showDialog(params);
	};

	return exports;
})();
