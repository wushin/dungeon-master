
browserify src/client.js -o ./dist/scripts/dungeon-master.js
browserify src/client/vorld/mesher-worker.js -o ./dist/scripts/mesher-worker.js
mkdir -p ./dist
lessc ./views/styles.less ./dist/styles.css
cp ./views/index.html ./dist/index.html
mkdir -p ./dist/images
cp -R ./assets/images/ ./dist/
