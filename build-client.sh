browserify src/client.js -o ../dungeon-master-deploy/client/scripts/dungeon-master.js
browserify src/client/vorld/mesher-worker.js -o ../dungeon-master-deploy/client/scripts/mesher-worker.js
mkdir -p ../dungeon-master-deploy/client
lessc ./views/styles.less ../dungeon-master-deploy/client/styles.css
cp ./views/index.html ../dungeon-master-deploy/client/index.html
cp -R ./assets/images/ ../dungeon-master-deploy/client/
