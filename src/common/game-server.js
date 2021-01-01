// Game Server!
// Handles the greet / acknoledge
// informing the gameclient of their player id and any required on connection state
// as well as informing the other clients that someone connected
// Currently also handles everything else we want to be server authoritative, e.g. level generation
let MessageType = require('./message-types');
let World = require('./world');
let Bounds = require('../fury/src/bounds');
let Maths = require('../fury/src/maths');

// Testing Only
let CredentialChecker = {
	checkPassword: (password) => {
		switch (password) {
			case "admin":
				return 2;	// Is DM
			case "password":
				return 1; // Is Player
			default:
				return 0;	// Invalid Password
		}
	}
};

let GameServer = module.exports = (function() {
	let exports = {};

	// Format is (idToSendTo, objectToSend) for message
	// Format is (idToExclude, objectToSend) for distribute (-1 sends to all)
	// Updated Format is (playerId, idToExclude, objectToSend) for distribute (-1 sends to all in same world)
	let sendMessage, distributeMessage;

	let ServerWorldInstance = (function(){
		let exports = {};
		exports.create = function() {

			let instance = {};
			instance.connectionCount = 0;
			instance.isComplete = false;
			instance.globalState = {
				players: []
				// TODO: Add entity [] with entity state changes
			};

			instance.world = World.create();

			let level = "debug";	// TODO: Load something sane
			instance.globalState.level = level;
			instance.world.createLevel(level);

			return instance;
		};
		return exports;
	})();

	let worldInstances = [];	// TODO: Change to "games"
	let idToInstance = {};		// TODO: ID to game

	let assignToWorldInstance = (id) => {
		// TODO: Choice between games  to be assigned to
		let instanceIndex = -1;
		let firstEmptyInstanceIndex = -1;
		for (let i = 0, l = worldInstances.length; i < l; i++) {
			if (firstEmptyInstanceIndex == -1 && (worldInstances[i] == null || worldInstances[i] == undefined)) {
				firstEmptyInstanceIndex = i;
			}
			if (worldInstances[i] && !worldInstances[i].isComplete) {
				instanceIndex = i;
				break;
			}
		}
		if (instanceIndex == -1) {
			// No instances create a new one!
			if (firstEmptyInstanceIndex != -1) {
				instanceIndex = firstEmptyInstanceIndex;
				worldInstances[firstEmptyInstanceIndex] = ServerWorldInstance.create();
			} else {
				instanceIndex = worldInstances.push(ServerWorldInstance.create()) - 1;
			}
		}
		idToInstance[id] = instanceIndex;
		worldInstances[instanceIndex].connectionCount += 1;
	};

	let getGlobalState = (id) => {
		return worldInstances[idToInstance[id]].globalState;
	};

	let getWorld = (id) => {
		return worldInstances[idToInstance[id]].world;
	};

	let getServerWorldInstance = (id) => {
		return worldInstances[idToInstance[id]];
	};

	exports.init = (sendDelegate, distributeDelegate) => {
		sendMessage = sendDelegate;
		// Own distribute - only send to players in same world
		distributeMessage = (playerId, excludeId, message) => {
			let players = getGlobalState(playerId).players;
			for (let i = 0, l = players.length; i < l; i++) {
				if (players[i] !== undefined && players[i] !== null && players[i].id != excludeId) {
					sendMessage(players[i].id, message);
					// On server this'll repeat stringify which isn't great, a send with predicate might be cute
					// or a send to array of ids, but it's fine for now
				}
			}
		};
	};

	exports.onclientconnect = (id) => {
		assignToWorldInstance(id);
		sendMessage(id, { type: MessageType.ACKNOWLEDGE, id: id, data: getGlobalState(id) });
	};

	let positionCache = [0,0,0];

	// Helpers for copying into DTOs
	// TODO: Move to common so we can reuse for client side DTOs
	// note + converts back from string to number, arguably should use round
	// https://stackoverflow.com/a/41716722
	let round = (num) => {
		return Math.round(num * 100 + Number.EPSILON) / 100;
	};

	let cloneArray3 = (array) => {
		return [ round(array[0]), round(array[1]), round(array[2]) ];
	};
	let copyArray3 = (out, array) => {
		out[0] = round(array[0]);
		out[1] = round(array[1]);
		out[2] = round(array[2]);
	};
	let cloneArray4 = (array) => {
		return [ round(array[0]), round(array[1]), round(array[2]), round(array[3]) ];
	};
	let copyArray4 = (out, array) => {
		out[0] = round(array[0]);
		out[1] = round(array[1]);
		out[2] = round(array[2]);
		out[3] = round(array[3]);
	};

	exports.onmessage = (id, message) => {
		// Adjust for instance
		let globalState = getGlobalState(id);
		let world = getWorld(id);

		switch(message.type) {
			case MessageType.GREET:
				let nick = message.nick;
				let pass = message.password;
				let authLevel = CredentialChecker.checkPassword(pass);
				if (authLevel > 0) {
					if (!nick) nick = "Player " + (id + 1);
					globalState.players[id] = { id: id, nick: nick, auth: authLevel, position: cloneArray3(world.initialSpawnPosition), rotation: [0,0,0,1] };
					distributeMessage(id, -1, { type: MessageType.CONNECTED, id: id, player: globalState.players[id] });
				} else {
					// Disconnect player
					return false;
				}
				break;
			case MessageType.POSITION:  // This is more a player transform / input sync
				message.id = id;

				copyArray3(positionCache, message.position);
				let hasPositionChanged = !Maths.vec3.equals(positionCache, globalState.players[id].position);
				if (hasPositionChanged)
				copyArray3(globalState.players[id].position, message.position);
				copyArray4(globalState.players[id].rotation, message.rotation);

				// Distribute to other players
				distributeMessage(id, id, message); // TODO: Relevancy / Spacial Partitioning plz (players in same section only)
				break;
			default:
				message.id = id;
				distributeMessage(id, id, message);
				break;
		}

		return true;
	};

	exports.onclientdisconnect = (id) => {
		if (id === undefined || id === null) {
			return;
		}
		
		let globalState = getGlobalState(id);
		// Only report disconnection of players which have sent greet
		if (globalState.players[id]) {
			globalState.players[id] = null; // Remove from state
			distributeMessage(id, id, { type: MessageType.DISCONNECTED, id: id });
		}
		let worldInstanceIndex = idToInstance[id];
		let worldInstance = worldInstances[worldInstanceIndex];
		worldInstance.connectionCount -= 1;
		if (worldInstance.connectionCount <= 0) {
			// Everyone has left, kill it
			worldInstances[worldInstanceIndex] = null;
		}
	};

	return exports;

})();
