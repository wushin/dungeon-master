let uWS = require('uWebSockets.js');
let CloseCode = require('./common/websocket-close-codes');

// Config
// Would be better read from a config file
const isLocalHost = true;
const idleTimeout = 120;
const maxConnections =  8;

let app;
if (isLocalHost) {
	app = uWS.App();
} else {
	app = uWS.SSLApp({
		key_file_name: '../ws/misc/privkey.pem',
		cert_file_name: '../ws/misc/fullchain.pem'
	});
}

let Connections = require('./server/connections');
Connections.init(maxConnections, isLocalHost);

let GameServer = require('./common/game-server');
GameServer.init(
	(id, message) => { Connections.sendMessage(id, JSON.stringify(message)); },
	(id, message) => { Connections.distribute(id, JSON.stringify(message)); }
);

// If we want to run a 'gameloop' we would use setImmediate
// https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/
// However I'm mildly concerned this will have a performance impact on the hw
// which is also running delphic.me.uk so unless we host a separate VPS for that
// we might prefer to stick to responding in events and relying on clients to
// react appropriately for now.

app.ws("/*", {
	idleTimeout: idleTimeout,
	maxBackpressure: 1024,	// NOTE: A web socket won't "publish" messages but will send them if backpressure reached
	maxPayloadLength: 512,	// If received payload is greater than max payload length connection is closed immediately
	compression: uWS.DEDICATED_COMPRESSOR_3KB,	// I don't know what the trade offs of different compressions are... maybe find out?
	/* WS events */
	/* DOCS: https://unetworking.github.io/uWebSockets.js/generated/interfaces/websocketbehavior.html */
	open: (ws) => {
		if (Connections.wsopen(ws)) {
			GameServer.onclientconnect(ws.id);
		}
	},
	message: (ws, message, isBinary) => {
		// Assuming JSON for now
		let json = Buffer.from(message).toString();
		if (!GameServer.onmessage(ws.id, JSON.parse(json), isBinary)) {
			// If the GameServer doesn't like the message, kill the connection
			Connections.disconnect(ws, CloseCode.INVALID_CREDENTIALS);
		}
	},
	drain: (ws) => { /* Backed up message sent, if we were throttling we could now lift it - should check ws.getBufferedAmount() to drive throttling */ },
	close: (ws, code, message) => {
		let id = ws.id;
		if (Connections.wsclose(ws)) {
			if (id !== undefined && id !== null) {
				GameServer.onclientdisconnect(id);
			}
		} else if (code != CloseCode.SERVER_FULL) {
			if (isLocalHost) console.log("Untracked ws connection closed");
		}
	}
});

app.get("/*", (res, req) => {
	res.writeStatus('200 OK').end("Vorld Decay Server Running, " + Connections.getConnectionCount() + " connected clients.");
});

app.listen(9001, (listenSocket) => {
	if (listenSocket) {
		console.log("Listening on port 9001");
	}
});
