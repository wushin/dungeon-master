let Chunk = require('./chunk');

let Vorld = module.exports = (function() {
	var exports = {};

	let getChunkKey = exports.getChunkKey = function(i, j, k) {
		// return i + "_" + j + "_" + k;
		// JS numbers are 64 bit
		// however bit shift treats numbers as 32 bit so do it by multiplication
		// Can 'bit shift' by 16 (and still have 16 bits left over, could use 21 bits)
		// Supporting -32768 -> 32767 for a total of 65,535
		// Shift indices to positive range
		i += 32768;
		j += 32768;
		k += 32768;
		return i + j * 65535 + k * 4294836225;
		// ideally this would be i + (j << 16) + (k << 32) but JS says no
	}

	exports.addChunk = function(vorld, chunk, i, j, k) {
		chunk.key = getChunkKey(i, j, k);
		chunk.indices = [i, j, k];
		vorld.chunks[chunk.key] = chunk;
	};
	exports.getChunk = function(vorld, i, j, k) {
		let key = getChunkKey(i, j, k);
		if (vorld.chunks[key]) {
				return vorld.chunks[key];
		}
		return null;
	};

	exports.getChunkKeyForBlock = function(vorld, x, y, z) {
		var size = vorld.chunkSize;
		var i = Math.floor(x / size),
			j = Math.floor(y / size),
			k = Math.floor(z / size);
		return getChunkKey(i, j, k);
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

	exports.setChunk = function(vorld, key, chunk) {
		vorld.chunks[key] = chunk;
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
