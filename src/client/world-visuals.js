let Fury = require('../fury/src/fury.js');
let Shaders = require('./shaders');
let Primitives = require('./primitives');

let vec3 = Fury.Maths.vec3;

let WorldVisuals = module.exports = (function() {
	let exports = {};

	let atlasMaterial, debugMaterial;

	let chunkObjects = [];

	exports.init = (callback) => {
		// Shader.create requires Fury to be initialised (i.e. it needs a gl context)
		// So this init needs to be called after Fury.init

		// TODO: have an asset loader with a combined callback once done
		// Use Hestia as inspiration, it had a much better system
		let itemsToLoad = 0;
		let loadCallback = () => {
			itemsToLoad -= 1;
			if (itemsToLoad == 0) {
				callback();
			}
		};

		let fogColor = vec3.fromValues(0,0,0.01);
		let glowShaderFogDensity = 0.1;  // Also set in player-visuals.js

		let applyLightingInfo = function(material) {
			material.lightDir = vec3.fromValues(-1.0, 2.0, 1.0); // Was -1, 2, 1
			material.lightColor = vec3.fromValues(1.0, 1.0, 1.0);
			material.ambientColor = vec3.fromValues(0.5, 0.5, 0.5);
			material.fogColor = fogColor;
			material.fogDensity = 0.125;
		}

		let createGlowShader = function(shader, color) {
			let material = Fury.Material.create({ shader: shader });
			material.color = color;
			material.fogColor = fogColor;
			material.fogDensity = glowShaderFogDensity;
			return material;
		}

		let glowShader = Fury.Shader.create(Shaders.ColorFog);
		// TODO: ^^ A cache of created shaders might be a good idea or we're going to be swapping shader programs unnecessarily

		exports.whiteMaterial = createGlowShader(glowShader, vec3.fromValues(0.9, 0.9, 0.9));
		exports.blackMaterial = createGlowShader(glowShader, vec3.fromValues(0.1, 0.1, 0.1));

		atlasMaterial = Fury.Material.create({ shader: Fury.Shader.create(Shaders.Voxel) });
		atlasMaterial.loadTexture = (src, cb) => {
			let image = new Image();
			image.onload = () => {
				let texture = Fury.Renderer.createTextureArray(image, 64, 64, 13, "pixel", true); // "low"/"pixel" quality depending on if going purposefully low res
				// TODO: 13 is based on vorld config, so should actually base it off that
				atlasMaterial.textures["uSampler"] = texture;
				applyLightingInfo(atlasMaterial);
				cb();
			};
			image.src = src;
		};

		debugMaterial = Fury.Material.create({ shader: Fury.Shader.create(Shaders.UnlitTextured) });
		debugMaterial.loadTexture = (src, cb) => {
			let image = new Image();
			image.onload = () => {
				debugMaterial.textures["uSampler"] = Fury.Renderer.createTexture(image, "high");
				cb();
			};
			image.src = src;
		};

		itemsToLoad += 1;
		atlasMaterial.loadTexture("./images/atlas_array.png", loadCallback);
		itemsToLoad += 1;
		debugMaterial.loadTexture("./images/checkerboard.png", loadCallback);
	};

	exports.generateVisuals = (world, scene, callback) => {
		// Debug meshes
		let boxes = world.boxes;
		for (let i = 0, l = boxes.length; i < l; i++) {
			let box = boxes[i];
			let meshData = Primitives.createCuboidMesh(box.size[0], box.size[1], box.size[2]);
			let mesh = Fury.Mesh.create(meshData);
			// TODO: World should be in charge of including some id for visuals which lets client know what materials etc to use
			box.visuals = scene.add({
				mesh: mesh,
				position: box.center,
				static: true,
				material: debugMaterial
			});
		}

		let vorld = world.vorld;
		if (!vorld) {
			return;
		}

		// "Generating Meshes"
		// $("#progressBarInner").width("0%");

		var worker = new Worker('./scripts/mesher-worker.js');
		worker.onmessage = function(e) {
			if (e.data.mesh) {
				var mesh = Fury.Mesh.create(e.data.mesh);
				mesh.tileBuffer = Fury.Renderer.createBuffer(e.data.mesh.tileIndices, 1);
				// ^^ TODO: have some way of attaching additional generic buffer info into
				// mesh data, so we don't have to do this step manually
				var chunkObject = scene.add({
					static: true,
					mesh: mesh,
					material: atlasMaterial,
					position: vec3.clone(e.data.offset)
				});
				chunkObjects.push(chunkObject);
			}
			if (e.data.progress !== undefined) {
				// $("#progressBarInner").width((e.data.progress * 100) + "%");
			}
			if (e.data.complete) {
				// $("#progressDisplay").hide();
				if (callback) {
						callback();
				}
			}
		};
		worker.postMessage({
			chunkData: vorld
		});
	};

	return exports;
})();
