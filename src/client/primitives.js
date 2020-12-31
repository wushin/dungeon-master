// Helper for creating mesh primitives
let Fury = require('../fury/src/fury.js'); // Needed for TriangleStrip renderMode

var Primitives = module.exports = (function() {
	var exports = {};

	var createCuboidMesh = exports.createCuboidMesh = (width, height, depth) => {
		let sx = width / 2, sy = height / 2, sz = depth / 2;
		return {
			vertices: [
				// Front face
				-sx, -sy,  sz,
				 sx, -sy,  sz,
				 sx,  sy,  sz,
				-sx,  sy,  sz,

				// Back face
				-sx, -sy, -sz,
				-sx,  sy, -sz,
				 sx,  sy, -sz,
				 sx, -sy, -sz,

				// Top face
				-sx,  sy, -sz,
				-sx,  sy,  sz,
				 sx,  sy,  sz,
				 sx,  sy, -sz,

				// Bottom face
				-sx, -sy, -sz,
				 sx, -sy, -sz,
				 sx, -sy,  sz,
				-sx, -sy,  sz,

				// Right face
				 sx, -sy, -sz,
				 sx,  sy, -sz,
				 sx,  sy,  sz,
				 sx, -sy,  sz,

				// Left face
				-sx, -sy, -sz,
				-sx, -sy,  sz,
				-sx,  sy,  sz,
				-sx,  sy, -sz],
			textureCoordinates: [
				// Front face
				0.0, 0.0,
				width, 0.0,
				width, height,
				0.0, height,

				// Back face
				width, 0.0,
				width, height,
				0.0, height,
				0.0, 0.0,

				// Top face
				0.0, depth,
				0.0, 0.0,
				width, 0.0,
				width, depth,

				// Bottom face
				width, depth,
				0.0, depth,
				0.0, 0.0,
				width, 0.0,

				// Right face
				depth, 0.0,
				depth, height,
				0.0, height,
				0.0, 0.0,

				// Left face
				0.0, 0.0,
				depth, 0.0,
				depth, height,
				0.0, height ],
			indices: [
				0, 1, 2,      0, 2, 3,    // Front face
				4, 5, 6,      4, 6, 7,    // Back face
				8, 9, 10,     8, 10, 11,  // Top face
				12, 13, 14,   12, 14, 15, // Bottom face
				16, 17, 18,   16, 18, 19, // Right face
				20, 21, 22,   20, 22, 23  // Left face
			] };
	};

	exports.createQuad = (size) => {
		return {
			vertices: [ size * 0.5, size * 0.5, 0.0, size * -0.5,  size * 0.5, 0.0, size * 0.5, size * -0.5, 0.0, size * -0.5, size * -0.5, 0.0 ],
			textureCoordinates: [ 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0 ],
			renderMode: Fury.Renderer.RenderMode.TriangleStrip
	 };
	};

	exports.createCubeMesh = (size) => {
		return createCuboidMesh(size, size, size);
	};

	return exports;
})();
