let CommandParser = module.exports = (function() {
	let exports = {};

	let tryParseRoll = (result, body) => {
		result.type = 'roll';
		result.dieRolls = [];
		result.modifiers = [];

		body = body.replaceAll(' ','');

		// Q: can we add a modify roll / reroll command ?
		// /reroll lowest 2d6 grabs last roll finds the appropriate dice rolls and rerolls them
		// add and * for only accept if higher and *- for only accept if lower ?
		// This would be easier with virutal dice where you actually rolled them and could reroll them
		// and it tracked the rolls?

		let success = false;

		let nextAdditionIndex = body.indexOf('+', 0);
		let nextSubtractionIndex = body.indexOf('-', 0);

		if (nextAdditionIndex != 0 && nextSubtractionIndex != 0) {
			// There's no starting +/- so assume it's positive
			nextAdditionIndex = 0;
		}

		while (nextAdditionIndex >= 0 || nextSubtractionIndex >= 0) {
			let a = nextAdditionIndex, b = nextSubtractionIndex;
			if (a == -1) a = body.length;
			if (b == -1) b = body.length;
			let startIndex = Math.min(a, b);

			nextAdditionIndex = body.indexOf('+', startIndex + 1);
			nextSubtractionIndex = body.indexOf('-', startIndex + 1);
			a = nextAdditionIndex, b = nextSubtractionIndex;
			if (a == -1) a = body.length;
			if (b == -1) b = body.length;
			let endIndex = Math.min(a, b);

			let term = body.substring(startIndex, endIndex);

			let dIndex = term.indexOf('d');
			if (dIndex >= 0) {
				// Dice Term
				if (dIndex > 0 && dIndex + 1 != term.length) {
					// TODO: Add A(s) at the end for advantage (pick highest of x number of rolls)
					// TODO: Add D(s) at the end for disadvantage (pick lowest of x number of rolls)
					let diceCount = Number.parseInt(term.substring(0, dIndex), 10);
					let diceSize = Number.parseInt(term.substring(dIndex+1, term.length), 10);
					if (!isNaN(diceCount) && !isNaN(diceSize)) {
						success = true;
						result.dieRolls.push({ count: Math.abs(diceCount), size: Math.abs(diceSize), negative: Math.sign(diceCount) < 0  });
					}
				}
			} else {
				// Modifier Term
				let modifier = Number.parseInt(term, 10);
				if (!isNaN(modifier)) {
					success = true;
					result.modifiers.push(modifier);
				}
			}
		}

		return success;
	};

	exports.isCommand = (str) => {
		return str.startsWith('/') && str.trim().length > 1 && str[1] != ' ';
	};

	exports.tryParseCommand = (result, str) => {
		let input = str.trim();
		let commandEndIndex = input.indexOf(' ');
		if (commandEndIndex === -1) {
			commandEndIndex = input.length;
		}
		let command = input.substring(1, commandEndIndex).toLowerCase();
		let body = input.substring(commandEndIndex, input.length).trim().toLowerCase();

		switch(command) {
			case 'roll':
				return tryParseRoll(result, body);
			case 'me':
				result.type = 'emote';
				result.emote = body;
				return true;
			default:
				return false;
		}
	};

	return exports;
})();
