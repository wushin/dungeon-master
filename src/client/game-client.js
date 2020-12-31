let MessageType = require('../common/message-types');
let Fury = require('../fury/src/fury.js');
let Player = require('./player');
let PlayerVisuals = require('./player-visuals');
let WorldVisuals = require('./world-visuals');

// glMatrix
let vec3 = Fury.Maths.vec3, quat = Fury.Maths.quat;


// HACK: Global for notifying game start - should attach a listener
gameStart = function() {
	gameStarted = true;
};

// Game Client
// Handles the visuals, local player movement, and interp of remote clients
let GameClient = module.exports = (function(){
	let exports = {};

	let glCanvas;
	let resolutionFactor = 1, cameraRatio = 16 / 9;
	let camera = Fury.Camera.create({
		near: 0.1,
		far: 10000,
		fov: 1.0472,
		ratio: cameraRatio,
		position: vec3.fromValues(0, 2, 3)
	});
	camera.targetPosition = vec3.clone(camera.position);
	camera.playerOffset = vec3.fromValues(0, 1, 0);
	let scene = Fury.Scene.create({ camera: camera, enableFrustumCulling: true });
	let world = require('../common/world').create();

	let localId = -1;
	let localNick = "";
	let sendMessage; // fn expects simple obj to send, does not expect you to send id - server will append

	let localPlayer;
	let players = []; // Note currently index != id

	let messageQueue = [];
	let assetLoadComplete = false;

	let serverState = {
		players: [] // Contains id, position, nick
	};

	let updateCanvasSize = (event) => {
		glCanvas.width = resolutionFactor * glCanvas.clientWidth;
		glCanvas.height = resolutionFactor * glCanvas.clientHeight;
		cameraRatio = glCanvas.clientWidth / glCanvas.clientHeight;
		if (camera && camera.ratio) camera.ratio = cameraRatio;
	};

	// TODO: Separate nick setting (i.e. greet response)
	exports.init = (nick, sendDelegate) => {
		sendMessage = sendDelegate;
		localNick = nick;

		glCanvas = document.getElementById("fury");
		window.addEventListener('resize', updateCanvasSize);
		updateCanvasSize();

		Fury.init("fury", { antialias: false });

		// Start loading required assets
		PlayerVisuals.init();
		WorldVisuals.init(() => {
			assetLoadComplete = true;
			if (messageQueue.length > 0) {
				for(let i = 0, l = messageQueue.length; i < l; i++) {
					exports.onmessage(messageQueue[i]);
				}
				messageQueue.length = 0;
			}
			lastTime = Date.now();
			window.requestAnimationFrame(loop);
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

		// Update Players
		for (let i = 0, l = players.length; i < l; i++) {
			if (players[i]) {
				players[i].update(elapsed);
			}
		}

		if (localPlayer) {
			// Update Camera
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
		}

		scene.render();

		Fury.Input.handleFrameFinished();

		window.requestAnimationFrame(loop);
	};

	exports.onmessage = (message) => {
		// Wait for initial asset load
		if (!assetLoadComplete) {
			messageQueue.push(message);
			return;
		}

		switch(message.type) {
			case MessageType.ACKNOWLEDGE:
				// NOTE: Will happen post init but not necessarily post asset load
				localId = message.id;
				handleInitialServerState(message.data);

				// TODO: Delay this greet until we're sure we have got nick name.
				sendMessage({ type: MessageType.GREET, nick: localNick });
				break;
			case MessageType.CONNECTED:
				serverState.players[message.id] = message.player;
				spawnPlayer(message.id, message.player);
				break;
			case MessageType.DISCONNECTED:
				serverState.players[message.id] = null;
				dropPickups(message.id);
				despawnPlayer(message.id);
				break;
			case MessageType.POSITION:
				serverState.players[message.id].position = message.position;
				updatePlayer(message.id, message);
				break;
		}
	};

	exports.ondisconnect = () => {
		if (Fury.Input.isPointerLocked()) {
			Fury.Input.releasePointerLock();
		}
		alert("Disconnected from Server!");
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

		// TODO: players and tokens are not 1:1 remove this from being automatic
		// Spawn replicas for all existing players
		for (let i = 0, l = state.players.length; i < l; i++) {
			if (state.players[i]) {
				if (state.players[i].id != localId) {
					spawnPlayer(state.players[i].id, state.players[i]);
				} else {
					console.error("Received player data in initial state with local id");
				}
			}
		}

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
