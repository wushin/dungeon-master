let MessageType = require('../common/message-types');
let Fury = require('../fury/src/fury.js');
let Player = require('./player');
let PlayerVisuals = require('./player-visuals');
let WorldVisuals = require('./world-visuals');
let GameUI = require('./game-ui');
let ChatCommandParser = require('./chat/command-parser');

// glMatrix
let vec3 = Fury.Maths.vec3, quat = Fury.Maths.quat;

// Game Client
// Handles the visuals, local player movement, and interp of remote clients
let GameClient = module.exports = (function(){
	let exports = {};

	let glCanvas;
	let pixelsPerUnit = 32;	// NOTE: This needs to match the resolution of our texture atlas
	let resolutionFactor = 2, cameraRatio = 16 / 9, cameraHeight = 540 / pixelsPerUnit;
	let camera = Fury.Camera.create({
		type: Fury.Camera.Type.Orthonormal,
		near: 0.1,
		far: 10000,
		//fov: 1.0472,
		height: cameraHeight,
		ratio: cameraRatio,
		position: vec3.fromValues(0, 10, 0),
		rotation: Fury.Maths.quatEuler(-90, 0, 0)
	});
	camera.targetPosition = vec3.clone(camera.position);
	// camera.playerOffset = vec3.fromValues(0, 1, 0);

	let scene = Fury.Scene.create({ camera: camera, enableFrustumCulling: true });
	let world = require('../common/world').create();

	let localId = -1;
	let localNick = "";
	let password = "";
	let sendMessage; // fn expects simple obj to send, does not expect you to send id - server will append

	let localPlayer;
	let players = []; // Note currently index != id

	let messageQueue = [];
	let assetLoadComplete = false;

	let serverState = {
		players: [] // Contains id, position, nick
	};

	let updateCanvasSize = (event) => {
		// Q: what happens when clientWidth or clientHeight / factor isn't an integer?
		glCanvas.width = glCanvas.clientWidth / resolutionFactor;
		glCanvas.height = glCanvas.clientHeight / resolutionFactor;
		cameraRatio = glCanvas.clientWidth / glCanvas.clientHeight;
		cameraHeight = glCanvas.height / pixelsPerUnit;
		if (camera && camera.ratio !== undefined) camera.ratio = cameraRatio;
		if (camera && camera.height !== undefined) camera.height = cameraHeight;
	};

	exports.init = (sendDelegate, startConnection) => {
		sendMessage = sendDelegate;

		glCanvas = document.getElementById("fury");
		window.addEventListener('resize', updateCanvasSize);
		updateCanvasSize();

		GameUI.init();

		Fury.init("fury", { antialias: false });
		// Clear Color #F1ECDF (241,236,223)
		// Fury.Renderer.clearColor(241.0 / 255.0, 236.0 / 255.0, 223.0 / 255.0);	// Can has hex to RGB converter?
		// Also this should be "setClearColor" and we should be able to just pass a vec3 or vec4

		let loadingCallback = null;

		// Start loading required assets
		PlayerVisuals.init();
		WorldVisuals.init(() => {
			assetLoadComplete = true;

			// Act on Message Queue (should be empty now that Game-Client controls flow)
			if (messageQueue.length > 0) {
				for(let i = 0, l = messageQueue.length; i < l; i++) {
					exports.onmessage(messageQueue[i]);
				}
				messageQueue.length = 0;
			}

			lastTime = Date.now();
			window.requestAnimationFrame(loop);

			if (loadingCallback != null) {
				loadingCallback();
			}
		});

		// Request Login Details
		let onConfirm = (values) => {
			localNick = values["nick"];
			password = values["password"];
			if (assetLoadComplete) {
				startConnection(localNick, password);
			} else {
				loadingCallback = () => { startConnection(localNick, password) };
			}
		};

		GameUI.showDialog({
			title: "Enter Login Details",
			width: 500,
			top: 150,
			fields: [
				{ id: "nick", type: "text", label: "Name:" },
				{ id: "password", type: "password", label: "Password:" }
			],
			confirmLabel: "Confirm",
			onConfirm: onConfirm
		});
	};

	let lastTime = 0;
	let lastNetSendTime = 0, sendInterval = 1/ 20;

	let loop = () => {
		let time = Date.now();
		let elapsed = time - lastTime;
		lastTime += elapsed;
		if (elapsed > 66) elapsed = 66;
		// ^^ Minimm 15 FPS - this is primarily to compenstate for alt-tab / focus loss
		elapsed /= 1000;  // Convert to seconds

		let sendNetUpdate = false;
		if (time - lastNetSendTime >= sendInterval) {
			sendNetUpdate = true;
			lastNetSendTime = time;
		}

		if (GameUI.chat && GameUI.chat.input && Fury.Input.keyDown('Enter', true)) {
			// Minor issue - localhost means you connect and acknoledge immediately so
			// if you pressed enter to complete the login dialog, it immediately focuses chat
			GameUI.chat.input.focus();
		}

		// Update Players
		for (let i = 0, l = players.length; i < l; i++) {
			if (players[i]) {
				players[i].update(elapsed);
			}
		}

		if (localPlayer) {
			// Update Camera
			// TODO: Extract to follow camera module
			vec3.add(camera.targetPosition, camera.playerOffset, localPlayer.position);
			if (localPlayer.snapCamera) {
				vec3.copy(camera.position, camera.targetPosition);
				localPlayer.snapCamera = false;
			} else {
				vec3.lerp(camera.position, camera.targetPosition, localPlayer.position, 0.25);
			}
			quat.copy(camera.rotation, localPlayer.lookRotation);

			if ((sendNetUpdate && localPlayer.stateDirty) || localPlayer.inputDirty) {
				localPlayer.stateDirty = localPlayer.inputDirty = false;
				sendMessage(localPlayer.updateMessage);
			}
		} else {
			// Top down camera
			// TODO: Mouse Drag - also extract to a top down camera module
			let unitsPerSecond = 4;
			if (Fury.Input.keyDown("Up")) {
				vec3.scaleAndAdd(camera.position, camera.position, Fury.Maths.vec3Z, -unitsPerSecond * elapsed);
			}
			if (Fury.Input.keyDown("Down")) {
				vec3.scaleAndAdd(camera.position, camera.position, Fury.Maths.vec3Z, unitsPerSecond * elapsed);
			}
			if (Fury.Input.keyDown("Left")) {
				vec3.scaleAndAdd(camera.position, camera.position, Fury.Maths.vec3X, - unitsPerSecond * elapsed);
			}
			if (Fury.Input.keyDown("Right")) {
				vec3.scaleAndAdd(camera.position, camera.position, Fury.Maths.vec3X, unitsPerSecond * elapsed);
			}
			if (Fury.Input.mouseDown(1) && (Fury.Input.MouseDelta[0] != 0 || Fury.Input.MouseDelta[1] != 0)) {
				vec3.scaleAndAdd(camera.position, camera.position, Fury.Maths.vec3X, - Fury.Input.MouseDelta[0] * elapsed);
				vec3.scaleAndAdd(camera.position, camera.position, Fury.Maths.vec3Z, - Fury.Input.MouseDelta[1] * elapsed);
			}
		}

		scene.render();

		Fury.Input.handleFrameFinished();

		window.requestAnimationFrame(loop);
	};

	let chatDto = { type: MessageType.CHAT, text: '' };
	let sendChatMessage = (message) => {
		// TODO: use ChatCommandParser to check for chat commands!
		if (ChatCommandParser.isCommand(message)) {
			let command = {};
			if (ChatCommandParser.tryParseCommand(command, message)) {
				chatDto.text = '';
				chatDto.command = command;
			} else {
				// TODO: Show local error
			}
		} else {
			chatDto.text = message;
			chatDto.command = null;
		}
		sendMessage(chatDto);
	};

	exports.onmessage = (message) => {
		// Wait for initial asset load
		if (!assetLoadComplete) {
			console.error("Message received before asset load complete");
			// Now that we control when to connect, this should be unnecessary so log error
			// however lets still handle this gracefully
			messageQueue.push(message);
			return;
		}

		switch(message.type) {
			case MessageType.ACKNOWLEDGE:
				localId = message.id;
				handleInitialServerState(message.data);

				sendMessage({ type: MessageType.GREET, nick: localNick, password: password });
				GameUI.initChat(localId, sendChatMessage);
				break;
			case MessageType.CONNECTED:
				serverState.players[message.id] = message.player;
				// spawnPlayer(message.id, message.player);
				GameUI.chat.onJoin(message.id, message.player.nick);
				break;
			case MessageType.DISCONNECTED:
				GameUI.chat.onLeave(message.id, serverState.players[message.id].nick);
				// despawnPlayer(message.id);
				serverState.players[message.id] = null;
				break;
			case MessageType.CHAT:
				GameUI.chat.addMessage(message.id, serverState.players[message.id].nick, message.text, message.command);
				break;
			case MessageType.POSITION:
				serverState.players[message.id].position = message.position;
				updatePlayer(message.id, message);
				break;
		}
	};

	exports.ondisconnect = (reason) => {
		if (Fury.Input.isPointerLocked()) {
			Fury.Input.releasePointerLock();
		}
		alert("Disconnected from Server: " + reason);
		window.location = window.location;
	};

	let handleInitialServerState = (state) => {
		// NOTE: Will happen post init but not necessarily post asset load
		serverState = state;

		// Load world level and instanitate scene visuals
		world.createLevel(serverState.level);

		// TODO: Wait for asset load - test with players already connected OR update visual creation to wait for asset load
		// Add world objects to render scene
		WorldVisuals.generateVisuals(world, scene, () => {
			// World visuals instanitated - could defer player spawn until this point
		});

		// Spawn replicas for all existing players
		/* players and tokens are not 1:1 hence the comment out
		for (let i = 0, l = state.players.length; i < l; i++) {
			if (state.players[i]) {
				if (state.players[i].id != localId) {
					spawnPlayer(state.players[i].id, state.players[i]);
				} else {
					console.error("Received player data in initial state with local id");
				}
			}
		}*/

		// TODO: Handle entity state
	};

	let spawnPlayer = (id, player) => {
		if (id == localId) {
			localNick = player.nick;
			localPlayer = Player.create({
				id: id,
				position: vec3.clone(player.position),
				rotation: quat.clone(player.rotation),
				world: world });
			players.push(localPlayer);
		} else {
			let replica = Player.create({
				id: id,
				isReplica: true,
				position: vec3.clone(player.position),
				rotation: quat.clone(player.rotation),
				world: world });
			replica.visuals = PlayerVisuals.create(replica, scene);
			players.push(replica);
		}
	};

	let getPlayer = (id) => {
		for (let i = 0, l = players.length; i < l; i++) {
			if (players[i] && players[i].id == id) {
				return players[i];
			}
		}
		return null;
	};

	let updatePlayer = (id, message) => {
		if (id == localId) {
			// Received correction from server
			localPlayer.setLocalState(message);
		} else {
			// Update Replica
			for (let i = 0, l = players.length; i < l; i++) {
				if (players[i] && players[i].id == id) {
					players[i].setReplicaState(message);
					break;
				}
			}
		}
	};

	let despawnPlayer = (id) => {
		for(let i = 0, l = players.length; i < l; i++) {
			if (players[i] && players[i].id == id) {
				if (players[i].visuals) {
					scene.remove(players[i].visuals);
				}
				players[i] = null;
				// Would be nice to shorten the list but eh
				break;
			}
		}
	};

	return exports;
})();
