let Chunk = require('./chunk');

let Vorld = module.exports = (function() {
	var exports = {};

	// TODO: Try keying on something we can build without garbage allocation?

	exports.addChunk = function(vorld, chunk, i, j, k) {
		vorld.chunks[i+"_"+j+"_"+k] = chunk;  // Also garbage allocation but not as bad as in get
		chunk.indices = [i, j, k];
	};
	exports.getChunk = function(vorld, i, j, k) {
		var key = i+"_"+j+"_"+k;  // You monster - garbage allocation everywhere
		if (vorld.chunks[key]) {
				return vorld.chunks[key];
		}
		return null;
	};

	exports.addBlock = function(vorld, x, y, z, block) {
		var size = vorld.chunkSize;
		var chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		var blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		var chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (!chunk) {
			chunk = Chunk.create({ size: vorld.chunkSize });
			Vorld.addChunk(vorld, chunk, chunkI, chunkJ, chunkK);
		}
		Chunk.addBlock(chunk, blockI, blockJ, blockK, block);
	};
	exports.addBlockRotation = function(vorld, x, y, z, rotation) {
		var size = vorld.chunkSize;
		var chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		var blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		var chunk = exports.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (!chunk) {
			chunk = Chunk.create({ size: vorld.chunkSize });
			Vorld.addChunk(vorld, chunk, chunkI, chunkJ, chunkK);
		}
		Chunk.addBlockRotation(chunk, blockI, blockJ, blockK, rotation);
	};

	exports.getBlock = function(vorld, x, y, z) {
		var size = vorld.chunkSize;
		var chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		var blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		return exports.getBlockByIndex(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK);
	};
	exports.getBlockRotation = function(vorld, x, y, z) {
		var size = vorld.chunkSize;
		var chunkI = Math.floor(x / size),
			chunkJ = Math.floor(y / size),
			chunkK = Math.floor(z / size);
		var blockI = x - (chunkI * size),
			blockJ = y - (chunkJ * size),
			blockK = z - (chunkK * size);
		return exports.getBlockRotationByIndex(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK);
	};

	exports.getBlockByIndex = function(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK) {
		// Assumes you won't go out by more than chunkSize
		if (blockI >= vorld.chunkSize) {
			blockI = blockI - vorld.chunkSize;
			chunkI += 1;
		} else if (blockI < 0) {
			blockI = vorld.chunkSize + blockI;
			chunkI -= 1;
		}
		if (blockJ >= vorld.chunkSize) {
			blockJ = blockJ - vorld.chunkSize;
			chunkJ += 1;
		} else if (blockJ < 0) {
			blockJ = vorld.chunkSize + blockJ;
			chunkJ -= 1;
		}
		if (blockK >= vorld.chunkSize) {
			blockK = blockK - vorld.chunkSize;
			chunkK += 1;
		} else if (blockK < 0) {
			blockK = vorld.chunkSize + blockK;
			chunkK -= 1;
		}

		var chunk = Vorld.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlock(chunk, blockI, blockJ, blockK);
		}
		return null;
	};
	exports.getBlockRotationByIndex = function(vorld, blockI, blockJ, blockK, chunkI, chunkJ, chunkK) {
		// Assumes you won't go out by more than chunkSize
		if (blockI >= vorld.chunkSize) {
			blockI = blockI - vorld.chunkSize;
			chunkI += 1;
		} else if (blockI < 0) {
			blockI = vorld.chunkSize + blockI;
			chunkI -= 1;
		}
		if (blockJ >= vorld.chunkSize) {
			blockJ = blockJ - vorld.chunkSize;
			chunkJ += 1;
		} else if (blockJ < 0) {
			blockJ = vorld.chunkSize + blockJ;
			chunkJ -= 1;
		}
		if (blockK >= vorld.chunkSize) {
			blockK = blockK - vorld.chunkSize;
			chunkK += 1;
		} else if (blockK < 0) {
			blockK = vorld.chunkSize + blockK;
			chunkK -= 1;
		}

		var chunk = Vorld.getChunk(vorld, chunkI, chunkJ, chunkK);
		if (chunk) {
			return Chunk.getBlockRotation(chunk, blockI, blockJ, blockK);
		}
		return null;
	};

	exports.create = function(parameters) {
		var vorld = {};
		if (parameters && parameters.chunkSize) {
			vorld.chunkSize = parameters.chunkSize;
		} else {
			vorld.chunkSize = 32;
		}
		vorld.chunks = {};
		if (parameters && parameters.chunks) {
			var keys = Object.keys(parameters.chunks);
			for(var i = 0, l = keys.length; i < l; i++) {
				vorld.chunks[keys[i]] = Chunk.create(parameters.chunks[keys[i]]);
			}
		}
		return vorld;
	};

	return exports;
})();
