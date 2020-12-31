let Mesher = require('./mesher');

onmessage = function(event) {
	Mesher.mesh(event.data.chunkData, postMessage);
	postMessage({ complete: true });
};
