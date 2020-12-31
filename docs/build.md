Source files contained in `src/`
Client HTML/CSS is contained within `views/`

Release builds are made to a separate deploy repo to allow for git pull without
having all source and assets in deployed version or build artifacts in source repo.

## Full Build
`browserify src/client.js -o ../dungeon-master-deploy/client/scripts/dungeon-master.js`
`browserify src/client/vorld/mesher-worker.js -o ../dungeon-master-deploy/client/scripts/mesher-worker.js`

Note workers use browserify instead of import scripts to bundle JS, so no need
to copy dependencies of the worker as well.

However this is a little dangerous as it's harder to deal with the caching of workers.
Currently worker is included as a script in the html page, however version numbers are
would be a more elegant solution for release builds.

Copy the following files and directories to `../dungeon-master-deploy/`
* `src/server.js`
* `src/server/ folder`
* `src/common/ folder`
* `src/fury/ folder`

## Local Testing
Run `build-client-local.sh`
Run `watchify src/client.js -o dist/scripts/dungeon-master.js`
Run `watchify src/client/vorld/mesher-worker.js -o dist/scripts/mesher-worker.js`
Run server.js from `src/` folder.
Run `http-server` in `dist/` folder.

## Deployment
Ensure isLocalHost is set to false in both client and server scripts before deployment.
Set version numbers on generated client JS and update src links in html manually.

Make sure SSL key + cert is copied to `../ws/misc/` as
* `privkey.pem`
* `fullchain.pem`
respectively.

SSH to VPS.
git pull on `dungeon-master-deploy` repo
Make sure nvm is set to use node 10+.
Manually run node server on VPS.

### TODO
* Versioning to prevent caching problems forcing Ctrl + F5
* Automatically update scripts or config based on build type
