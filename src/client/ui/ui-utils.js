// Various utility functions
// It would be nice to put them on the UI class however that creates a circular dependency
// that apparently browserify doesn't like

let UIUtils = module.exports = (function() {
	let exports = {};

	exports.applyPositioning = (element, params) => {
		if (params.width) {
			element.style.width = params.width + "px";
		}
		if (params.height) {
			element.style.height = params.height + "px";
		}

		// TODO: Make anchoring explicit rather than implicit on
		// top / bottom or left / right or their absence (centered)

		// Note assumes element already inserted into the DOM
		// Use vibiility hidden externally to prevent flickering
		// If not inserted into the DOM assumes you do not want to be centred
		// used to stop overlays having unnecessary logic set on them
		if (params.top) {
			element.style.top = params.top + "px";
		} else if (params.bottom) {
			element.style.bottom = params.bottom + "px";
		} else if (params.top === undefined && params.bottom == undefined && element.parentNode) {
			let top = (element.parentNode.clientHeight - element.clientHeight) / 2;
			element.style.top = top + "px";
		}

		if (params.left) {
			element.style.left = params.left + "px";
		} else if (params.right) {
			element.style.right = params.right + "px";
		} else if (params.left === undefined && params.right === undefined && element.parentNode) {
			let left = (element.parentNode.clientWidth - element.clientWidth) / 2;
			element.style.left = left + "px";
		}

		// Note: if popup is set to position relative instead of absolute
		// 'bottom' and 'right' act essentially as -top and -left
	};

	return exports;
})()
