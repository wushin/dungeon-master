let UIUtils = require('./ui-utils');

let Dialog = module.exports = (function() {
	let exports = {};

	exports.create = (overlay, params) => {
		// No wrapper for dialog, it's just going to return the element
		let dialog = document.createElement('div');
		dialog.classList.add('popup');

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
			confirm.onclick = (event) => {
				let values = getFieldValues();
				dialog.remove();
				params.onConfirm(values);
			}
		} else {
			confirm.onclick = (event) => {
				dialog.remove();
			}
		}
		confirm.onkeydown = (event) => { event.stopPropagation(); }	// Prevent fury from reading key strokes when this element is focused
		buttons.appendChild(confirm);


		dialog.style.visibility = 'hidden';
		overlay.appendChild(dialog);

		if (!params.width) {
			params.width = 600;
		}
		UIUtils.applyPositioning(dialog, params);
		dialog.style.visibility = "";

		return dialog;
	};

	return exports;
})();
