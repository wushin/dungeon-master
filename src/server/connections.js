// Handles opening and closing ws connections gives them an id
// Can also distribute messages to all connections
// Does not contain player or position tracking as that needs to be in common
let closeCodes = require('../common/websocket-close-codes');

let Connections = module.exports = (function() {
	var exports = {};

	let isDebug;
	let maxConnections;
	let connectionCount = 0;
	let connections = [];

	let addConection = (ws) => {
		for(let i = 0; i < maxConnections; i++) {
			if (!connections[i]) {
				connections[i] = ws;
				ws.id = i;
				if (isDebug) console.log("[" + i + "] Added new connection");
				break;
			}
		}
		// Should maybe handle if no free connection was found even though it should be impossible?
		connectionCount += 1;
	};

	let removeConnection = (ws) => {
		connections[ws.id] = null;
		connectionCount -= 1;
		if (isDebug) console.log("[" + ws.id + "] Removed connection");
	};

	exports.init = (maxConnectionCount, debug) => {
		maxConnections = maxConnectionCount;
		isDebug = debug;
	};

	exports.getConnectionCount = () => {
		return connectionCount;
	};

	exports.wsopen = (ws) => {
		// Would be nice if we could identify reconnection attempts
		if (connectionCount < maxConnections) {
			addConection(ws);
			return true;
		} else {
			let errorMessage = "Connection Refused: Maximum number of connections reached";
			if (isDebug) console.log(errorMessage);
			ws.end(closeCodes.SERVER_FULL, errorMessage);
			return false;
		}
	};

	exports.wsclose = (ws) => {
		if (ws.id !== undefined) {
			removeConnection(ws);
			ws.id = null;
			return true;
		}
		return false;
	};

	exports.disconnect = (ws, closeCode, reason) => {
		exports.wsclose(ws);
		ws.end(closeCode, reason);
	};

	// May need a priority system if throttling becomes a thing, always
	// want certain messages sent ASAP - arguably this could be achieved
	// via multiple socket connections, don't know if this is standard however
	exports.sendMessage = (targetId, message, isBinary) => {
		if (connections[targetId]) {
			let ok = connections[targetId].send(message, isBinary, true);
		}
	};

	exports.distribute = (senderId, message, isBinary) => {
		for (let i = 0; i < maxConnections; i++) {
			if (connections[i] && connections[i].id != senderId) {
				let ok = connections[i].send(message, isBinary, true);
				// TODO: handle ok, understand backpressure implications if false
				// i.e. throttle if backpressure is high
			}
		}
	};
	return exports;
})();
