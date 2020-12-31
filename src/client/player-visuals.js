let Fury = require('../fury/src/fury.js');
let Primitives = require('./primitives');
let Shaders = require('./shaders');
let Player = require('./player');
let vec3 = Fury.Maths.vec3;

let PlayerVisuals = module.exports = (function() {
	let exports = {};
	let prototype = {};

	let playerMesh, playerMaterial;

	exports.init = () => {
		playerMaterial = Fury.Material.create({ shader: Fury.Shader.create(Shaders.ColorFog) });
		playerMaterial.color = vec3.fromValues(1.0, 0.0, 0.3);
		playerMaterial.fogColor = vec3.create();
		playerMaterial.fogDensity = 0.1; // TODO: coordinate with worldvisuals
		// Should we save creating the mesh until we know the player proportions?
		playerMesh = Fury.Mesh.create(Primitives.createCuboidMesh(0.75 * Player.size[0], Player.size[1], 0.75 * Player.size[2]));
	};

	exports.create = (player, scene) => {
		let visuals = scene.add({
			mesh: playerMesh,
			material: playerMaterial,
			position: player.position,
			rotation: player.rotation
		});
		return visuals;
	};

	return exports;
})();
