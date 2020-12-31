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

		let fill = function(xMin, xMax, yMin, yMax, zMin, zMax, block) {
			for (let x = xMin; x <= xMax; x++) {
				for (let z = zMin; z <= zMax; z++) {
					for (let y = yMin; y <= yMax; y++) {
						Vorld.addBlock(vorld, x, y, z, block);
					}
				}
			}
		};

		let createRoom = function(x,y,z, w,h,d) {
			let wall = VorldConfig.BlockIds.STONE_BLOCKS;
			let floor = VorldConfig.BlockIds.STONE;
			let ceiling = VorldConfig.BlockIds.STONE;

			// existing w = 9 x = -4
			// d = 9 z = -4
			// h = 4 y = 0
			fill(x,x+w-1, y,y+h-1, z+d,z+d, wall);
			fill(x,x+w-1, y,y+h-1, z-1,z-1, wall);
			fill(x+w,x+w, y,y+h-1, z,z+d-1, wall);
			fill(x-1,x-1, y,y+h-1, z,z+d-1, wall);

			fill(x,x+w-1, y+h,y+h, z,z+d-1, ceiling);
			fill(x,x+w-1, y-1,y-1, z,z+d-1, floor);
		}

		let createTestSteps = function(level) {
			// test steps!
			level.push(world.addBox(-0.25, 0.25, 0, 0.25, -3.5, -3));
			level.push(world.addBox(-0.25, 0.25, 0, 0.5, -4, -3.5));
		};


		world.createLevel = (level) => {
			// TODO: Some actual logic
			createRoom(-5,0,-10, 11,5,11);
		};

		// TODO: Create spawn methods with listeners

		return world;
	};

	return exports;
})();
