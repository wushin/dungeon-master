// Character Controller handles physics and movement for characters (players)
let Fury = require('../fury/src/fury.js');
let Vorld = require('../common/vorld/vorld.js');
let Physics = Fury.Physics;
let Maths = Fury.Maths;
let vec2 = Maths.vec2, vec3 = Maths.vec3, quat = Maths.quat;

var CharacterController = module.exports = (function() {
	var exports = {};
	var prototype = {};

	exports.create = (params) => {
		let controller = Object.create(prototype);

		let player = params.player;

		let collisions = [];

		let lastPosition = vec3.clone(player.position);
		let targetPosition = vec3.clone(player.position);

		let playerBox = Physics.Box.create({
			center: player.position,
			size: vec3.clone(player.size)
		});

		let voxelCollisionResult = {
			foundX: false,
			foundZ: false,
			timeX: 0,
			timeZ: 0
		};

		controller.stepHeight = params.stepHeight;

		let enteredVoxelOnAxis = function(box, i, position, displacement) {
			return !(box.min[i] - displacement < position+1 && box.max[i] - displacement > position)
				&& (box.min[i] < position + 1 && box.max[i] > position);
		}

		let checkVoxelCollisionXZ = function(result, delta, foundX, foundZ) {
			// Assumes player box has already moved to targetPosition by delta
			result.foundX = foundX;
			result.foundZ = foundZ;
			result.timeX = 0;
			result.timeZ = 0;
			/* result.boxXMin = playerBox.min[0];
			result.boxXMax = playerBox.max[0];
			result.boxZMin = playerBox.min[2];
			result.boxZMax = playerBox.max[2];*/

			for (let x = Math.floor(playerBox.min[0]), xMax = Math.ceil(playerBox.max[0]); x < xMax; x++) {
				for (let y = Math.floor(playerBox.min[1]), yMax = Math.ceil(playerBox.max[1]); y < yMax; y++) {
					for (let z = Math.floor(playerBox.min[2]), zMax = Math.ceil(playerBox.max[2]); z < zMax; z++) {
						if (Vorld.getBlock(player.world.vorld, x, y, z)) {
							if (enteredVoxelOnAxis(playerBox, 0, x, delta[0]) && !result.foundX) {  // We're moving maximum of 1 unit, and voxels have the same positions so if we've found one we dont' need to check any more
								result.foundX = true;
								let distance = 0;
								if (delta[0] > 0) { // => max crossed x
									distance = delta[0] - (playerBox.max[0] - x);
								} else { // => min crossed x+1
									distance = -delta[0] - (x+1 - playerBox.min[0]);
								}
								let time = distance / Math.abs(delta[0]); // distance / speed (where unit time == elapsed)
								result.timeX = time;  // would check against existing time if we had to keep checking other boxes
								result.deltaX = delta[0];
							}
							if (enteredVoxelOnAxis(playerBox, 2, z, delta[2]) && !result.foundZ) {
								result.foundZ = true;
								let distance = 0;
								if (delta[2] > 0) { // => max crossed z
									distance = delta[2] - (playerBox.max[2] - z);
								} else { // => min crossed z+1
									distance = -delta[2] - (z+1 - playerBox.min[2]);
								}
								let time = distance / Math.abs(delta[2]); // distance / speed (where unit time == elapsed)
								result.timeZ = time;  // would check against existing time if we had to keep checking other boxes
								result.deltaZ = delta[2];
							}

							if (result.foundX && result.foundZ) {
								// Again, moving max of 1 unit, and voxels have same positions
								// so if we've found a collision in each axis can just exit
								break;
							}
						}
					}
				}
			}
		}

		let checkVoxelIntersection = function(vorld, bounds) {
			for (let x = Math.floor(bounds.min[0]), xMax = Math.ceil(bounds.max[0]); x < xMax; x++) {
				for (let y = Math.floor(bounds.min[1]), yMax = Math.ceil(bounds.max[1]); y < yMax; y++) {
					for (let z = Math.floor(bounds.min[2]), zMax = Math.ceil(bounds.max[2]); z < zMax; z++) {
						if (Vorld.getBlock(vorld, x, y, z)) {
							return true;
						}
					}
				}
			}
			return false;
		}

		// Simple AABB collision detection, slow speed only, X,Z movement only
		controller.xzMove = function(delta) {
			// Simple voxel check
			// first assert that movement is less than 1 in each direction
			// would need to use more complex collider types to support higher speeds
			if (Math.abs(delta[0]) > 1) {
				delta[0] = Math.sign(delta[0]);
			}
			delta[1] = 0;
			if (Math.abs(delta[2]) > 1) {
				delta[2] = Math.sign(delta[2]);
			}

			vec3.copy(lastPosition, player.position);
			vec3.add(targetPosition, lastPosition, delta);

			// Move player to new position for physics checks
			vec3.copy(player.position, targetPosition);
			// playerBox.center has changed because it's set to the playerPosition ref
			playerBox.calculateMinMax(playerBox.center, playerBox.extents);

			// Voxel version - check vorld for intersections a new position
			// and get 'time' of collision in that axis
			checkVoxelCollisionXZ(voxelCollisionResult, delta, false, false);
			let foundX = voxelCollisionResult.foundX;
			let foundZ = voxelCollisionResult.foundZ;

			if (foundX && foundZ) {
				// Can we move in one but not the other?
				let dx = delta[0], dz = delta[2];
				let canMoveXOnly = false, canMoveZOnly = false;

				// Check can move z only
				delta[0] = 0;
				// Recalculate target position
				vec3.add(targetPosition, lastPosition, delta);
				vec3.copy(player.position, targetPosition);
				playerBox.calculateMinMax(playerBox.center, playerBox.extents);

				checkVoxelCollisionXZ(voxelCollisionResult, delta, true, false);
				canMoveZOnly = !voxelCollisionResult.foundZ;

				// Check can move x only
				delta[0] = dx;
				delta[2] = 0;
				// Recalculate target position
				vec3.add(targetPosition, lastPosition, delta);
				vec3.copy(player.position, targetPosition);
				playerBox.calculateMinMax(playerBox.center, playerBox.extents);

				checkVoxelCollisionXZ(voxelCollisionResult, delta, false, true);
				canMoveXOnly = !voxelCollisionResult.foundX;

				if (canMoveXOnly && !canMoveZOnly) {
					delta[0] = dx;
					delta[2] = 0; // Tehnically already set but setting again for clarity
					foundX = false;
				} else if (canMoveZOnly && !canMoveXOnly) {
					delta[0] = 0;
					delta[2] = dz;
					foundZ = false;
				} else if (canMoveXOnly && canMoveZOnly) {
					// Tie Break!
					let timeX = voxelCollisionResult.timeX;
					let timeZ = voxelCollisionResult.timeZ;
					if (timeX < timeZ) {
						delta[0] = 0;
						delta[2] = dz;
						foundZ = false;
					} else {  // TODO: do we need to tie break the tie break when times are equal?
						delta[0] = dx;
						delta[2] = 0;
						foundX = false;
					}
				} else {
					// Can't move at all just stop
					delta[0] = 0;
					delta[2] = 0;
				}
			} else if (foundX) {
				delta[0] = 0;
			} else if (foundZ) {
				delta[2] = 0;
			}
			// TODO: ^^ Support steps / half-voxels - would require checking if step was possible
			// and if it is, stop other axis first (if step is not also available)
			// *Then* test new delta against y if it fails... just abort all movement
			// (technically we could get more accurate but eh, seems like a *lot* of effort)

			// TODO: Decouple setting player.position from these calculations
			// evaluate delta first and only apply at the end.

			if (foundX || foundZ) { // => delta changed
				// Update target position, and player position, and playerBox for world checks
				vec3.add(targetPosition, lastPosition, delta);
				vec3.copy(player.position, targetPosition);
				playerBox.calculateMinMax(playerBox.center, playerBox.extents);
				if (foundX && foundZ) {
					// Not moving so skip further checks
					return;
				}
			}

			// TODO: Improved Collision Algorithm (implemented for voxels above)
			// (Account for corner cases and flush colliders when moving)
			// Use swept bounds (will catch things you would pass through)
			// Get All Intersections
			// Evaluate each axis against all intersections (check for enter)
			// Get intersection time by looking at min / max (accounting for movement direction)
			// Break ties based on previous frame velocity
			// Check if you can continue on one axis and not the other, and if so do that
			// else if you can continue on both
			// whichever entry for that axis happens first - cancel movement on that axis (or step)

			// If step recaculate bounds and check again against x-z
			// After these are resolved if stepped check against world finally and cancel all movement if entering
			// this is specifically to stop you entering the ceiling but it's a nice catch all too

			// We used to have the collision handling outside the loop, but has we need to continue
			// the loops I moved it inside, a world collision method which returned a list of boxes
			// that overlapped would be acceptable.
			let stepCount = 0, stepX = false, stepZ = false;
			for (let i = 0, l = player.world.boxes.length; i < l; i++) {
				let worldBox = player.world.boxes[i];
				if (Physics.Box.intersect(playerBox, worldBox)) {
						// Check each axis individually and only stop movement on those which changed from
					// not overlapping to overlapping. In theory we should calculate distance and move
					// up to it for high speeds, however we'd probably want a skin depth, for the speeds
					// we're travelling, just stop is probably fine
					// BUG: You can get stuck on corners of flush surfaces when sliding along them
					// Should be resolvable if we find all colliding boxes first then respond with full information
					if (Physics.Box.enteredX(worldBox, playerBox, player.position[0] - lastPosition[0])) {
						let separation = worldBox.max[1] - playerBox.min[1];
						if (stepCount == 0 && !stepX && separation <= controller.stepHeight) {
							// Step!
							stepCount = 1;
							stepX = true;
							player.position[1] += separation;
						} else {
							player.position[0] = lastPosition[0];
							if (stepX) {
								// If have stepping in this direction already cancel
								player.position[1] = lastPosition[1];
							}
						}
					}
					if (Physics.Box.enteredZ(worldBox, playerBox, player.position[2] - lastPosition[2])) {
						let separation = worldBox.max[1] - playerBox.min[1];
						if (stepCount == 0 && !stepZ && separation <= controller.stepHeight) {
							// Step!
							stepCount = 1;
							stepZ = true;
							player.position[1] += separation;
						} else {
							player.position[2] = lastPosition[2];
							if (stepZ) {
								// If have stepped in this direction already cancel
								player.position[1] = lastPosition[1];
							}
						}
					}
					// Whilst we're only moving on x-z atm but if we change to fly camera we'll need this
					// Haven't tested this much as you might imagine
					if (Physics.Box.enteredY(worldBox, playerBox, player.position[1] - lastPosition[1])) {
						player.position[1] = lastPosition[1];
						// TODO: If stepped should reset those too?
					}
						// Note this only works AABB, for OOBB and other colliders we'd probably need to get
					// impact normal and then convert the movement to be perpendicular, and if there's multiple
					// collider collisions... ?
						// Update target position and box bounds for future checks
					vec3.copy(targetPosition, player.position);
					playerBox.calculateMinMax(playerBox.center, playerBox.extents);
					// TODO: if we've changed target y position because of steps we should technically re-evaluate all boxes on y axis
					// If collider and they are above us we should remove the step and cancel the x/z movement as appropriate
					// Have to check other boxes cause still moving, so no break - technically we could track which
					// axes we'd collided on and not check those in future if we wanted to try to optimize.
					// Also could break if all axes we moved in had returned true
					// Could also only check axes we were actually moving in
				}
			}
		};

		// Simplified move just for jumping / gravity
		controller.yMove = function(dy) {
			vec3.copy(lastPosition, player.position);

			// TODO: yVelocity can get big, should really be doing a cast check
			// rather than intersect check - however this requires decoupling
			// player.position and playerBox.center

			vec3.scaleAndAdd(player.position, player.position, Maths.vec3Y, dy);
			// playerBox.center has changed because it's set to the playerPosition ref
			playerBox.calculateMinMax(playerBox.center, playerBox.extents);

			if (checkVoxelIntersection(player.world.vorld, playerBox)) {
				// TODO: Should move up to the object instead - y Velocity can get big when falling
				vec3.copy(player.position, lastPosition);
				if (player.yVelocity < 0) {
					player.jumping = false;
				}
				player.yVelocity = 0;
				return;
			}

			let collision = false;
			for (let i = 0, l = player.world.boxes.length; i < l; i++) {
				if (Physics.Box.intersect(playerBox, player.world.boxes[i])) {
					collision = true;
					// Only moving on one axis don't need to do the slide checks
					break;
				}
			}
			if (collision) {
				// TODO: Should move up to the object instead - y Velocity can get big when falling
				vec3.copy(player.position, lastPosition);
				if (player.yVelocity < 0) {
					player.jumping = false;
					// ^^ TODO: Need to convert this into isGrounded check, and will need to
					// change dx / dz to be against slopes if/when we introduce them
				}
				player.yVelocity = 0;
			}
		};

		return controller;
	};

	return exports;
})();
