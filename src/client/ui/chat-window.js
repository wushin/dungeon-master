let UIUtils = require('./ui-utils');

let ChatWindow = module.exports = (function() {
	let exports = {};
	let proto = {};

	exports.create = (overlay, params) => {
		let cw = Object.create(proto);
		let sendMessage = params.sendMessage;	// send message
		cw.selfId = params.self;

		// Create HTML
		let element = document.createElement('div');
		element.classList.add("window");
		element.classList.add("chat");

		let content = document.createElement('div');
		content.classList.add("content");
		element.appendChild(content);

		let inputContainer = document.createElement('div');
		element.appendChild(inputContainer);

		let input = document.createElement('input');
		input.type = "text";
		input.classList.add("chatInput");
		if (params.onFocus) input.onfocus = params.onFocus;
		if (params.onBlur) {
			input.onblur = (event) => {
				input.value = '';
				params.onblur();
			};
		} else {
			input.onblur = (event) => {
				input.value = '';
			};
		}
		input.onkeydown = (event) => {
			if (event.key == 'Enter') {
				if (input.value) sendMessage(input.value);
				input.value = '';
				input.blur();
			}
			event.stopPropagation();
		};
		inputContainer.appendChild(input);

		element.style.visibility = "hidden";
		overlay.appendChild(element);
		UIUtils.applyPositioning(element, params);
		content.style.height = element.clientHeight + "px"
		element.style.visibility = "";

		let appendMessage = (text, className) => {
			let element = document.createElement('p');
			if (className) {
				element.classList.add(className);
			}
			element.append(text);
			content.appendChild(element);
		};

		cw.element = element;
		cw.input = input;
		cw.onJoin = (id, name) => {
			appendMessage(name + " joined the game", id == cw.selfId, "join");
		};
		cw.onLeave = (id, name) => {
			appendMessage(name + " left the game", id == cw.selfId, "left");
		};
		cw.addMessage = (id, name, message) => {
			appendMessage(name + ": " + message, (id == cw.selfId) ? "selfChat" : null);
		};

		return cw;
	};

	return exports;
})();
