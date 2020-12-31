
browserify src/client.js -o ./dist/scripts/dungeon-master.js
browserify src/client/vorld/mesher-worker.js -o ./dist/scripts/mesher-worker.js
mkdir -p ./dist
cp ./views/index.html ./dist/index.html
cp ./views/styles.css ./dist/styles.css
mkdir -p ./dist/images
cp -R ./assets/images/ ./dist/
