// UI Module - DHTML Generation for declarative programmic UI
// Could in theory swap out the HTML for in canvas UI
let UI = module.exports = (function() {
	let exports = {};

	let applyPositioning = (element, params) => {
		if (params.width) {
			element.style.width = params.width + "px";
		}
		if (params.height) {
			element.style.height = params.height + "px";
		}

		// TODO: Make anchoring explicit rather than implicit on
		// top / bottom or left / right or their absence (centered)
		if (params.top) {
			element.style.top = params.top + "px";
		} else if (params.bottom) {
			element.style.bottom = params.bottom + "px";
		}
		if (params.left) {
			element.style.left = params.left + "px";
		} else if (params.right) {
			element.style.right = params.right + "px";
		}
		// Note: if popup is set to position relative instead of absolute
		// 'bottom' and 'right' act essentially as -top and -left
	};

	// Creates a new UI overlay
	// Q: Do we really want the consumer to be in charge of ui layers?
	// There's somethings it would be nice to abstract, e.g. dialogs overlays
	// capturing pointer-events but other overlays not
	exports.create = (params) => {
		let ui = {};

		// TODO: Subscribe to resize and reposition auto centre anchored objects

		let overlay = document.createElement('div');
		overlay.classList.add('overlay');
		applyPositioning(overlay, params);

		let overlays = document.getElementById('overlays');
		// Add as first child i.e. works like a stack of UIs
		overlays.insertBefore(overlay, overlays.firstChild);

		ui.showDialog = (params) => {
			// TODO: Should probably add another div which has pointer-events: auto on it for dialogs
			// So as to prevent clicking other elements
			let dialog = document.createElement('div');
			dialog.classList.add('popup');
			dialog.style.visibility = 'hidden';

			let header = document.createElement('header');
			dialog.appendChild(header);
			let title = document.createElement('h2');
			title.append(params.title);
			header.appendChild(title);

			let content = document.createElement('div');
			content.classList.add('content');
			dialog.appendChild(content);

			if (params.message) {
				let message = document.createElement('p');
				message.append(params.message);
				content.appendChild(message);
			}

			let fieldIds = null;
			if (params.fields && params.fields.length) {
				fieldIds = [];
				content.classList.add('form');
				for (let i = 0, l = params.fields.length; i < l; i++) {
					let field = params.fields[i];
					let id = field.id;
					fieldIds.push(id);

					let control = document.createElement('div');
					control.classList.add('control');
					let label = document.createElement('label');
					label.append(field.label);
					let input = document.createElement('input');
					input.id = id;
					input.type = field.type;
					label.htmlFor = id;
					control.appendChild(label);
					control.appendChild(input);
					content.appendChild(control);
				}
			}

			let getFieldValues = () => {
				let values = null;
				if (fieldIds != null && fieldIds.length) {
					values = {};
					for (let i = 0, l = fieldIds.length; i < l; i++) {
						let id = fieldIds[i];
						values[id] = document.getElementById(id).value;
					}
				}
				return values;
			};

			let buttons = document.createElement('div');
			buttons.classList.add('buttons');
			content.appendChild(buttons);

			let confirm = document.createElement('input');
			confirm.classList.add('button');
			confirm.type = 'button';
			if (params.confirmLabel) {
				confirm.value = params.confirmLabel;
			} else {
				confirm.value = 'Ok';
			}
			if (params.onConfirm) {
				confirm.onclick = () => {
					let values = getFieldValues();
					dialog.remove();
					params.onConfirm(values);
				}
			} else {
				confirm.onclilck = () => {
					dialog.remove();
				}
			}
			buttons.appendChild(confirm);

			if (!params.width) {
				params.width = 600;
			}
			if (params.left === undefined && params.right === undefined) {
				params.left = (overlay.clientWidth - params.width) / 2;
			}
			applyPositioning(dialog, params);
			overlay.appendChild(dialog);

			if (params.top === undefined && params.bottom == undefined) {
				// Set Calculated Centered Top
				params.top = (overlay.clientHeight - dialog.clientHeight) / 2;
				dialog.style.top = params.top + "px";
			}
			dialog.style.visibility = "";
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
