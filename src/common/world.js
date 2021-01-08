let Fury = require('../fury/src/fury.js');
let Physics = Fury.Physics; // Could *just* import physics and maths
let Maths = Fury.Maths;
let vec3 = Maths.vec3, quat = Maths.quat;
let Vorld = require('./vorld/vorld');
let VorldConfig = require('./vorld/config');

let World = module.exports = (function() {
	// Contains AABBs of the world environment
	// and more importantly the 'vorld' which is the voxel data
	// In charge of adding relevant objects to world based on level name

	var exports = {};
	var prototype = {
		addBox: function(xMin, xMax, yMin, yMax, zMin, zMax) {
			let min = vec3.fromValues(xMin, yMin, zMin);
			let max = vec3.fromValues(xMax, yMax, zMax);
			let box = Physics.Box.create({ min: min, max: max });
			this.boxes.push(box);
			return box;
		},
		getIntersections: function(results, box) {
			results.length = 0;
			for (let i = 0, l = this.boxes.length; i < l; i++) {
				if (Physics.Box.intersect(box, this.boxes[i])) {
					results.push(box);
				}
			}
		},
		getEntity: function(id) {
			if (id) {
				let pickups = this.entities;
				for (let i = 0, l = entities.length; i < l; i++) {
					if (entities[i] && entities[i].id == id) {
						return entities[i];
					}
				}
			}
			return null;
		}
	};

	exports.create = function(params) {
		let world = Object.create(prototype);
		let vorld = Vorld.create({ chunkSize: 32 });

		world.vorld = vorld;
		world.boxes = [];	// TODO: Remove boxes? Just use Voxels?
		world.entities = [];
		world.initialSpawnPosition = [0, 1, 0];

		let fill = function(xMin, xMax, yMin, yMax, zMin, zMax, block, updatedChunks) {
			for (let x = xMin; x <= xMax; x++) {
				for (let z = zMin; z <= zMax; z++) {
					for (let y = yMin; y <= yMax; y++) {
						Vorld.addBlock(vorld, x, y, z, block);
						if (updatedChunks) {
							updatedChunks[Vorld.getChunkKeyForBlock(vorld, x, y, z)] = true;
							// TODO: Check for adjecent affected chunks as we need to add those too
							// Vorld.isOnChunkBorder(vorld, x, y, z) ?  Or maybe we should have optional parameter
							// on add and remove block that tells you affected Chunks instead
						}
					}
				}
			}
		};

		let createRoom = function(x,y,z, w,h,d, updatedChunks) {
			let wall = VorldConfig.BlockIds.STONE_BLOCKS;
			let floor = VorldConfig.BlockIds.STONE;
			let ceiling = VorldConfig.BlockIds.STONE;

			// existing w = 9 x = -4
			// d = 9 z = -4
			// h = 4 y = 0
			fill(x,x+w-1, y,y+h-1, z+d,z+d, wall, updatedChunks);
			fill(x,x+w-1, y,y+h-1, z-1,z-1, wall, updatedChunks);
			fill(x+w,x+w, y,y+h-1, z,z+d-1, wall, updatedChunks);
			fill(x-1,x-1, y,y+h-1, z,z+d-1, wall, updatedChunks);

			fill(x,x+w-1, y+h,y+h, z,z+d-1, ceiling, updatedChunks);
			fill(x,x+w-1, y-1,y-1, z,z+d-1, floor, updatedChunks);
		}

		let createTestSteps = function(level) {
			// test steps!
			level.push(world.addBox(-0.25, 0.25, 0, 0.25, -3.5, -3));
			level.push(world.addBox(-0.25, 0.25, 0, 0.5, -4, -3.5));
		};

		world.runCommand = (result, command) => {	// This isn't really a hot loop do we defo want a result object when sometimes we don't care?
			let args = command.args;
			switch(command.type) {
				case "createRoom":
					createRoom(args[0], args[1], args[2], args[3], args[4], args[5], result);
					// Writes updated chunk keys as the keys of the result arguably Object.keys(result) would be better but oh well
					// In order to support Undo we probably need to store more data (i.e. what you just overwrote)... on vorld at least
					// could use that extra 16 bits in chunkKeys for history, perhaps.
					break;
			}
		};

		world.createLevel = (level) => {
			// TODO: Load from... somewhere
			// Some actual logic maybe
			// This could also be a template to start from then just have a command history on top.
		};

		// TODO: Create spawn methods with listeners

		return world;
	};

	return exports;
})();
