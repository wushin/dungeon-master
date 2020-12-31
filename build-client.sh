browserify src/client.js -o ../dungeon-master-deploy/client/scripts/dungeon-master.js
browserify src/client/vorld/mesher-worker.js -o ../dungeon-master-deploy/client/scripts/mesher-worker.js
mkdir -p ../dungeon-master-deploy/client
cp ./views/index.html ../dungeon-master-deploy/client/index.html
cp ./views/styles.css ../dungeon-master-deploy/client/styles.css
cp -R ./assets/images/ ../dungeon-master-deploy/client/
