let CommandExecutor = module.exports = (function() {
	let exports = {};

	// TODO: Move to some utils for trying out loud
	let getRandomInt = (min, max) => {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
	};

	let executeRollCommand = (command) => {
		let total  = 0;
		let resultStr = "";

		for (let j = 0, n = command.dieRolls.length; j < n; j++) {
			let dieRoll = command.dieRolls[j];
			for (let i = 0, l = dieRoll.count; i < l; i++) {
				let roll = (1 + getRandomInt(0, dieRoll.size));

				if (resultStr.length > 0) {
					if (dieRoll.negative) {
						resultStr += " - ";
					} else {
						resultStr += " + ";
					}
				} else if (dieRoll.negative) {
					resultStr += "- ";
				}
				resultStr += roll;
				resultStr += " (d";
				resultStr += dieRoll.size;
				resultStr += ")";

				if (dieRoll.negative) {
					total -= roll;
				} else {
					total += roll;
				}
			}
		}

		if (command.modifiers) {
			for (let i = 0, l = command.modifiers.length; i < l; i++) {
				let modifier = command.modifiers[i];
				if (resultStr.length > 0) {
					if (modifier < 0) {
						resultStr += " - ";
					} else {
						resultStr += " + ";
					}
				} else if (modifier < 0) {
					resultStr += "- ";
				}
				resultStr += Math.abs(modifier);
				total += modifier;
			}
		}

		resultStr += " = ";
		resultStr += total;

		return resultStr;
	};

	exports.executeCommand = (command) => {
		switch (command.type) {
			case 'roll':
				return executeRollCommand(command);
			case 'emote':
				return command.emote;
		}
		return null;
	};

	return exports;
})();
