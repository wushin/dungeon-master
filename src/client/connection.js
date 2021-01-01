// Handles connecting to web socket server
// and provides messaging methods - but these should rarely be called directly
// as we may want to be using a local message relay instead

// Very thin wrapper around a web socket, makes it purely send and receive JSON
// Currently single static connection - no create method.

var Connection = module.exports = (function() {
	var exports = {};

	let isDebug;
	let webSocket;
	let connectionId;
	let onopen, onerror, onclose, onmessage;

	const pingInterval = 60 * 1000; // 60s
	let schedulePing = () => {
		window.setTimeout(ping, pingInterval);
	};
	let ping =  () => {
		if (webSocket.readyState == 1) {
			webSocket.send(JSON.stringify({ type: "ping" }));
			schedulePing();
		}
	};

	exports.send = (obj) => {
		if (webSocket.readyState == 1) {
			let data = JSON.stringify(obj);
			if (isDebug && obj.type != "position") console.log(data);
			webSocket.send(data);
		}
	};

	exports.connect = (params) => {
		isDebug = params.isDebug;
		webSocket = new WebSocket(params.uri);

		if (params.onopen) {
			onopen = params.onopen;
		} else {
			onopen = () => {};
		}
		if (params.onerror) {
			onerror = params.onerror;
		} else {
			onerror = () => {};
		}
		if (params.onclose) {
			onclose = params.onclose;
		} else {
			onclose = (code, reason) => {};
		}
		if (params.onmessage) {
			onmessage = params.onmessage;
		} else {
			onmessage = () => {};
		}

		webSocket.onopen = (event) => {
			if (isDebug) console.log("Web Socket Open");
			schedulePing();
			onopen();
		};
		webSocket.onerror = (event) => {
			if (isDebug) console.log("WebSocket Error Observed: ", event);
			onerror();
		};
		webSocket.onclose = (event) => {
			if (isDebug) console.log("Web Socket Closed: " + event.code + " - " + event.reason);
			onclose(event.code, event.reason);
		};
		webSocket.onmessage = (event) => {
			let message = JSON.parse(event.data);
			if (isDebug && message.type != "position") console.log(event.data);
			onmessage(message);
		};
	};

	return exports;
})();
