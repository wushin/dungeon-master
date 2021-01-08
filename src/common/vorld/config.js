// TODO: This should be actual config not a class ?
var VorldConfig = module.exports = (function() {
	var exports = {};
	var blockIds = exports.BlockIds = {
			AIR: 0,
			STONE: 1,
			SOIL: 2,
			GRASS: 3,
			WOOD: 4,
			LEAVES: 5,
			WATER: 6,
			BEDROCK: 7,
			STONE_BLOCKS: 8,
			PLANKS: 9,
			HALF_STONE_BLOCKS: 10,
	};

	exports.isBlockSolid = function(block) {
		if (block > 0 && block != blockIds.HALF_STONE_BLOCKS) {
			return true;
		}
		return false;
	};

	exports.isHalfBlock = function(block) {
		return block == blockIds.HALF_STONE_BLOCKS;
	};

	exports.getBlockType = function(config, value) {
		// TODO: Return id instead of string
		if(value < config.thresholds[0]) {
			return blockIds.AIR;
		}
		if(value < config.thresholds[1]) {
			return blockIds.SOIL;
		}
		return blockIds.STONE;
	};
	exports.getTransformedBlockType = function(block, verticallyAdjacent) {
		if(block == blockIds.SOIL && !verticallyAdjacent) {
			return blockIds.GRASS;
		}
		return block;
	};
	exports.getShapingFunction = function(config) {
		// Would be cute to take a string you could just eval
		if (config.shapingFunction == "gaussian") {
				let a = config.amplitude, sdx = config.sdx, sdz = config.sdz, x0 = 0, z0 = 0;
				return function(x, y, z) {
						let fxy = a * Math.exp(-((((x - x0) * (x - x0)) / (2 * sdx * sdx)) + (((z -z0) * (z - z0)) / (2 * sdz * sdz))));
						return Math.max(0, 1 + (fxy - y) / config.yDenominator);
				};
		} else if (config.shapingFunction == "negative_y") {
				return function(x, y, z) {
						return (config.yOffset - y) / config.yDenominator;
				};
		} else if (config.shapingFunction == "inverse_y") {
				return function(x, y, z) {
						return 1 / (config.adjustmentFactor * (y + config.yOffset));
				};
		} else {
				return function(x, y, z) {
						return 1;
				};
		}
	};
	exports.getAtlasInfo = function() {
		// TODO: Build from parameters, perhaps an init from other methods
		// We have atlas builder maybe should move that there?
		var atlas = {};
		atlas.tileSize = 64;
		atlas.arraySize = 13;
		atlas.tileIndices = [];
		atlas.tileIndices[blockIds.GRASS] = { side: 1, top: 0, bottom: 2 };
		atlas.tileIndices[blockIds.SOIL] = { side: 2, top: 2, bottom: 2 };
		atlas.tileIndices[blockIds.STONE] = { side: 3, top: 3, bottom: 3 };	// Should be 5 but I'm messing
		atlas.tileIndices[blockIds.STONE_BLOCKS] = { side: 4, top: 4, bottom: 4 };
		atlas.tileIndices[blockIds.HALF_STONE_BLOCKS] = { side: 4, top: 4, bottom: 4 };
		atlas.tileIndices[blockIds.BEDROCK] = { side: 6, top: 6, bottom: 6 };
		atlas.tileIndices[blockIds.WOOD] = { side: 8, top: 7, bottom: 7 };
		atlas.tileIndices[blockIds.PLANKS] = { side: 10, top: 9, bottom: 9 };
		atlas.tileIndices[blockIds.LEAVES] = { side: 11, top: 11, bottom: 11 };
		atlas.tileIndices[blockIds.WATER] = { side: 12, top: 12, bottom: 12 };
		return atlas;
	};
	return exports;
})();
