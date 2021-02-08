var Chunk = module.exports = (function() {
	var exports = {};
	exports.addBlock = function(chunk, i, j, k, block) {
		chunk.blocks[i + chunk.size*j + chunk.size*chunk.size*k] = block;
		if (block == 0) {
			chunk.blockRotations[i + chunk.size*j + chunk.size*chunk.size*k] = null;
		}
	};
	exports.addBlockRotation = function(chunk, i, j, k, rotation) {
		chunk.blockRotations[i + chunk.size*j + chunk.size*chunk.size*k] = rotation;
	};
	exports.getBlock = function(chunk, i, j, k) {
		if(i < 0 || j < 0 || k < 0 || i >= chunk.size || j >= chunk.size || k >= chunk.size) {
			return null;
		}
		return chunk.blocks[i + chunk.size*j + chunk.size*chunk.size*k];
	};
	exports.getBlockRotation = function(chunk, i, j, k) {
		if(i < 0 || j < 0 || k < 0 || i >= chunk.size || j >= chunk.size || k >= chunk.size) {
			return null;
		}
		return chunk.blockRotations[i + chunk.size*j + chunk.size*chunk.size*k];
	};
	exports.isEmpty = function(chunk) {
		return chunk.blocks.length > 0;	// Technically we should check they aren't all 0 as well
	};
	exports.create = function(parameters) {
		// TODO: Convert to views on an array buffer for memory improvement
		var chunk = {};
		if (parameters && parameters.size) {
			chunk.size = parameters.size;
		} else {
			chunk.size = 32;
		}
		// TODO: parameters should determine block integer type (8 or 16, lets face it 32 would be overkill)
		if (parameters && parameters.blocks) {	// Do we ever actually use this?
			chunk.blocks = parameters.blocks;
		} else {
			chunk.blocks = new Uint8Array(32*32*32);	// Whilst this is certainly smaller when it's full, it's quite a lot more than sparse data (as it only goes up the highest entry)
		}
		if (parameters && parameters.blockRotations) {
			chunk.blockRotations = parameters.blockRotations;
		} else {
			chunk.blockRotations = new Uint8Array(32*32*32);
		}
		// For Rotations we should bit mask some uints to pack up and right into it... but for now just a value for vertical flip
		return chunk;
	};
	return exports;
})();
