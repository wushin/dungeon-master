// UI Module - DHTML Generation for declarative programmic UI
// Could in theory swap out the HTML for in canvas UI
let Dialog = require('./dialog');
let ChatWindow = require('./chat-window');
let UIUtils = require('./ui-utils');

let UI = module.exports = (function() {
	let exports = {};

	// Creates a new UI overlay / canvas / layer
	// Q: Do we really want the consumer to be in charge of ui layers?
	// There's somethings it would be nice to abstract, e.g. dialogs overlays
	// capturing pointer-events but other overlays not
	exports.create = (params) => {
		if (params === undefined || params === null) {
			params = {};
		}
		let ui = {};

		// TODO: Subscribe to resize and reposition auto centre anchored objects

		let overlay = document.createElement('div');
		overlay.classList.add('overlay');
		if (params.blocking) {
			overlay.classList.add('blocking');
		}
		// Q: Is the layouting code for overlays strictly the same?
		UIUtils.applyPositioning(overlay, params);

		let overlays = document.getElementById('overlays');
		// Add as first child i.e. works like a stack of UIs
		overlays.insertBefore(overlay, overlays.firstChild);

		ui.showDialog = (params) => {
			let dialogElement = Dialog.create(overlay, params);
			// NOTE: dialog remove themselves when closed
		};

		ui.createChat = (params) => {
			return ChatWindow.create(overlay, params);
		};

		ui.hide = () => {
			overlay.style.display = "none";
		};
		ui.show = () => {
			overlay.style.display = "block";
		};
		ui.remove = () => {
			overlay.remove();
		};

		return ui;
	};

	return exports;
})();
