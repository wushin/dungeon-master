// Client side player
// Handles both local player and replicas
// Handles input and movement

// We're going to mostly trust the clients on their position (haha)
// rather than run physics on server

// Currently just contains movement / physics code no visuals
// However deals with input, so would probably need to be split into
// player controller + player in order to move to common

let Fury = require('../fury/src/fury.js');
let MessageType = require('../common/message-types');

let Maths = Fury.Maths;
let vec2 = Maths.vec2, vec3 = Maths.vec3, quat = Maths.quat;

let Player = module.exports = (function() {
	let exports = {};
	let prototype = {};

	let size = exports.size = vec3.fromValues(1, 2, 1);

	// static methods
	let getPitch = function(q) {
		// Used to avoid gimbal lock
		let sinr_cosp = 2 * (q[3] * q[0] + q[1] * q[2]);
		let cosr_cosp = 1 - 2 * (q[0] * q[0] + q[1] * q[1]);
		return Math.atan(sinr_cosp / cosr_cosp);
		// If you want to know sector you need atan2(sinr_cosp, cosr_cosp)
		// but we don't in this case.
	};

	// Movement Settings
	let clampAngle = 10 * Math.PI / 180;
	let movementSpeed = 4, lookSpeed = 1;
	let mouseLookSpeed = 0.1, jumpDeltaV = 5;
	// Q: Do we need to scale mouseLookSpeed by canvas size?

	exports.create = (params) => {  // expected params: id, position, rotation, world, optional: isReplica
		var player = Object.create(prototype);

		let movementDelta = vec3.create();
		let targetRotation = quat.clone(params.rotation);

		let detectInput = function() {
			// Clear existing input
			player.lookInput[0] = 0;
			player.lookInput[1] = 0;
			player.input[0] = 0;
			player.input[1] = 0;

			// Look Input
			if (Fury.Input.isPointerLocked()) {
				player.lookInput[0] = - mouseLookSpeed * Fury.Input.MouseDelta[0];
				player.lookInput[1] = - mouseLookSpeed * Fury.Input.MouseDelta[1];
			}

			if (Fury.Input.keyDown("Left")) {
				player.lookInput[0] += lookSpeed;
			}
			if (Fury.Input.keyDown("Right")) {
				player.lookInput[0] -= lookSpeed;
			}
			if (Fury.Input.keyDown("Up")) {
				player.lookInput[1] += lookSpeed;
			}
			if (Fury.Input.keyDown("Down")) {
				player.lookInput[1] -= lookSpeed;
			}

			// Movement Input
			if (Fury.Input.keyDown("w")) {
				player.input[1] -= 1;
			}
			if (Fury.Input.keyDown("s")) {
				player.input[1] += 1;
			}
			if (Fury.Input.keyDown("a")) {
				player.input[0] -= 1;
			}
			if (Fury.Input.keyDown("d")) {
				player.input[0] += 1;
			}

			player.jumpInput = Fury.Input.keyDown("Space", true);

			if (player.updateMessage.input[0] != player.input[0]
				|| player.updateMessage.input[1] != player.input[1]
				|| player.updateMessage.jump != player.jumpInput) {
					player.inputDirty = true;
			}
		};

		// Reusable update message, also used as last input data
		// Note JS arrays for position, rotation for easy of JSON.stringify
		player.updateMessage = {
			type: MessageType.POSITION,
			position: [0,0,0],
			rotation: [0,0,0,1],
			input: [0,0],
			jump: false,
			yVelocity: 0
		};

		player.id = params.id;
		player.snapCamera = true;
		player.isReplica = !!params.isReplica;
		player.world = params.world;
		player.position = params.position;
		player.rotation = params.rotation;
		player.pitch = 0;
		player.lookRotation = quat.clone(params.rotation);
		player.localX = vec3.create();
		player.localZ = vec3.create();
		player.jumping = false;
		player.yVelocity = 0;
		player.size = vec3.clone(size);

		player.controller = require('./character-controller').create({
			player: player,
			stepHeight: 0.3,
		});

		// Input tracking / public setters (for replicas)
		player.input = [0,0];
		player.lookInput = [0, 0];  // Not networked, simply slerp rotation to target
		player.jumpInput = false;
		player.inputDirty = false;  // set to true if position changes (not rotation)
		player.stateDirty = false;  // set to true if position, rotation changes

		// The fact movement is dependent on rotation and we're not networking it
		// as often means we're going to get plenty of misprediction with extrapolation
		// we might want to switch to smoothed interp of previous positions instead

		player.setLocalState = (updateMessage) => {
			vec3.copy(player.position, updateMessage.position);
			quat.copy(player.rotation, updateMessage.rotation);
			if (updateMessage.snapLook) {
				quat.copy(player.lookRotation, updateMessage.rotation);
			}
			player.yVelocity = updateMessage.yVelocity;
			player.snapCamera = true;
		};

		player.setReplicaState = (updateMessage) => {
			// Copy across current position and inputs (for extrapolation)
			quat.copy(targetRotation, updateMessage.rotation);
			vec3.copy(player.position, updateMessage.position);
			vec2.copy(player.input, updateMessage.input);
			player.jumpInput = updateMessage.jumpInput;
			player.yVelocity = updateMessage.yVelocity;
		};

		player.update = function(elapsed) {
			// Note: Camera looks in -z, and thus almost all this code also
			// Uses forward = -z, we should change it to be sane and invert for the camera
			if (!player.isReplica) {
				detectInput(); // Note handles setting player.inputDirty
			} // else was set by server

			if (player.requestPickup) {
				vec3.copy(player.pickupMessage.position, player.position);  // Q: is it worth us rounding to 2dp to reduce weight?
			}

			// Rotation
			if (player.isReplica) {
				quat.slerp(player.rotation, targetRotation, player.rotation, 0.25);
			} else {
				// This is *full* of hacks need to give this a proper review post jam
				// and / or when it gives us problems again
				let halfPI = Math.PI/2;

				Maths.quatRotate(player.lookRotation, player.lookRotation, elapsed * player.lookInput[0], Maths.vec3Y);
				// ^^ The returned roll / pitch / yaw from these flick around a lot, don't know if this is that functions 'fault'
				// and using another method might work better, e.g. storing pitch / yaw as inputs and then creating quat from it
				// That would then remove all these hacks around calculating a useful pitch / yaw value
				let pitch = getPitch(player.lookRotation);  // atan rather than atan2 as we don't want more than -90:90 range
				let pitchRotation = elapsed * player.lookInput[1];
				if (Math.sign(pitch) == -Math.sign(pitchRotation) || Math.abs(pitch + pitchRotation) < halfPI - clampAngle) {
					quat.rotateX(player.lookRotation, player.lookRotation, pitchRotation);
				}
				quat.copy(targetRotation, player.lookRotation);

				vec3.transformQuat(player.localZ, Maths.vec3Z, player.lookRotation);
				let yaw = Maths.calculateYaw(player.lookRotation);
				if (isNaN(yaw)) { // Shouldn't be happening but again fuck it
					yaw = Math.sign(player.localZ[0]) * halfPI;
				}
				// HACK: Fuck it's a jam I'm bored of rotations just make it work
				if (player.localZ[2] < 0) {
					if (yaw < 0) {
						yaw = -halfPI - (halfPI + yaw);
					} else {
						yaw = halfPI + (halfPI - yaw);
					}
				}
				quat.setAxisAngle(player.rotation, Maths.vec3Y, yaw);

				/*
				let radToDeg = 180 / Math.PI;
				console.log("forward: " + player.localZ[0].toFixed(2) + ", " + player.localZ[1].toFixed(2) + ", " + player.localZ[2].toFixed(2)
					+ " roll: " + (radToDeg * Maths.calculateRoll(player.lookRotation)).toFixed(2)
					+ " pitch: " + (radToDeg * pitch).toFixed(2)
					+ " yaw: " + (radToDeg * yaw).toFixed(2));
				*/
			}

			// Calculate Local Axes from updated rotation
			vec3.transformQuat(player.localX, Maths.vec3X, player.rotation);
			vec3.transformQuat(player.localZ, Maths.vec3Z, player.rotation);

			// Calculate Target Position - from local x / local z
			let norm = (player.input[0] !== 0 && player.input[1] !== 0) ? (1 / Math.SQRT2) : 1;
			let ldx = norm * movementSpeed * elapsed * player.input[0];
			let ldz = norm * movementSpeed * elapsed * player.input[1];
			vec3.zero(movementDelta);
			vec3.scaleAndAdd(movementDelta, movementDelta, player.localZ, ldz);
			vec3.scaleAndAdd(movementDelta, movementDelta, player.localX, ldx);

			// Movement
			player.controller.xzMove(movementDelta);

			// Gravity
			if (!player.jumping && player.jumpInput) {
				player.jumping = true;
				player.yVelocity = jumpDeltaV;
			} else {  // Note - no !isGrounded check, relies on elapsed staying sane
				player.yVelocity -= 9.8 * elapsed;
			}
			player.controller.yMove(player.yVelocity * elapsed);

			if (player.heldItem) {
				// TODO: Define offset point?
				vec3.scaleAndAdd(player.heldItem.position, player.position, player.localZ, -0.5);
				if (player.dropMessage) {
					// TODO: Have server calculate drop position (as player position - 50% local Z)
					vec3.copy(player.dropMessage.position, player.heldItem.position);
				}
				vec3.scaleAndAdd(player.heldItem.position, player.heldItem.position, Maths.vec3Y, 0.35);
				quat.copy(player.heldItem.rotation, player.rotation);

				//vec3.scaleAndAdd(player.heldItem.position, player.heldItem.position, Maths.vec3Y, 1);
			}

			if (!player.isReplica) {
				// Update Update Message and set dirty flag
				if (!vec3.equals(player.updateMessage.position, player.position) || !quat.equals(player.updateMessage.rotation, player.rotation)) {
					player.stateDirty = true;
					// Something outside will handle setting false
				}

				vec3.copy(player.updateMessage.position, player.position);
				quat.copy(player.updateMessage.rotation, player.rotation);
				vec2.copy(player.updateMessage.input, player.input);
				player.updateMessage.jump = player.jumpInput;
				player.updateMessage.yVelocity = player.yVelocity;
			}
		};

		return player;
	};

	return exports;
})();
