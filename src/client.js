let CloseCode = require('./common/websocket-close-codes');

// Configuration
let isLocalHost = true; // Is running on localhost / development machine, not is hosting local server, or in fact hosting a server for other local clients
let useLocalServer = true;

// State
let connected = false; // Acknowledged by websocket server

let UI = require('./client/ui/ui');
let Connection = require('./client/connection');
let GameClient = require('./client/game-client');
let GameServer = require('./common/game-server');

let setupLocalServer = () => {
	GameServer.init(
		(id, message) => { GameClient.onmessage(message); },
		(id, message) => { if (id == -1) GameClient.onmessage(message); });

	// Might need to wait for local server to be ready
	// before faking a connection a connection like this
	GameServer.onclientconnect(0);
};

let sendMessage = (message) => {
	// Send either to web socket or to local server
	if (connected) {
		Connection.send(message);
	} else if (useLocalServer) {
		// Deep clone via json stringify / parse - prevents server messing with client objects when using local relay
		if (!GameServer.onmessage(0, JSON.parse(JSON.stringify(message)))) {
			// TODO: Handle GameServer being unhappy with message
		}
	}
};

let startConnection = (username, password) => {
	let wsOpened = false;

	// TODO: Currently GameServer and GameClient are in charge of
	// gathering and 'verifying' username and password, that should
	// probably be handled at the client / server level.

	// Try to connect to web socket server
	// No server present results in an error *then* a close (code 1006) (onopen is never called)
	// Full server results in an open event *then* a close (code 4006) (no error event)
	Connection.connect({
		isDebug: isLocalHost,
		uri: isLocalHost ? "ws://localhost:9001" : "wss://delphic.me.uk:9001",
		onopen: () => {
			wsOpened = true;
		},
		onmessage: (message) => {
			// Received at least one message => acknoledged by server
			// Set connected bool which makes sure messages sent by client
			// are sent through the web socket connection rather than the relay
			connected = true;
			GameClient.onmessage(message);
		},
		onerror: () => { /* Maybe do something IDK */ },
		onclose: (code, reason) => {
			if (!wsOpened || code == CloseCode.SERVER_FULL) {
				if (useLocalServer) {
					setupLocalServer();
				} else {
					// TODO: Show Error message
				}
			} else if (connected) {
				// Handle Disconnect
				connected = false;
				GameClient.ondisconnect(reason);
			}
		}
	});
};

window.onload = (event) => {
	// Game-Client should start loading whatever assets are needed
	// Will call start connection when it is ready
	GameClient.init(sendMessage, startConnection);
};
