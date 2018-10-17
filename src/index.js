var ghdownload = require('./lib/github-download/lib/github-download');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var rimraf = require('rimraf');
var https = require('https');
var fs = require('fs');

let jarviz_receiver_directory = `${__dirname}/../jarviz-receiver-dist`;
let jarviz_receiver;

let remotePackageJsonUrl = `https://raw.githubusercontent.com/dmwallace/jarviz-receiver/master/package.json?cacheBuster=${(new Date()).getTime()}`;

let checkForUpdateSuccess = false;
let checkForUpdateRetries = 6;
let checkForUpdateRetryCount = 0;
let checkForUpdateInterval = 5000;

main();

async function main() {
	try {
		await checkForUpdate();
		checkForUpdateSuccess = true;
		launch();
	} catch (err) {
		if (err) {
			console.error(err);
			if(++checkForUpdateRetryCount <= checkForUpdateRetries) {
				console.log(`failed to check for update, trying again in ${checkForUpdateInterval / 1000}seconds...`);
				setTimeout(main, checkForUpdateInterval);
			} else {
				console.log(`failed to check for update ${checkForUpdateRetries} times, attempting to launch local version...`);
				launch();
			}
			
		};
		
	}
	
	
}

async function checkForUpdate() {
	let local = getLocalPackageJson();
	
	if (!local) {
		try {
			await download();
		} catch (err) {
			if (err) {
				console.error(`Failed to download jarviz-receiver and no local copy exists.  Please ensure you have an internet connection and try again.`);
				process.exit(1);
			};
		}
	} else {
		let remote = await getRemotePackageJson();
		
		if (JSON.stringify(local) !== JSON.stringify(remote)) {
			console.log(`Local and remote packages do not match... downloading remote`);
			await download();
		} else {
			console.log(`Local and remote packages are the same`);
		}
	}
}

function getLocalPackageJson() {
	try {
		return JSON.parse(fs.readFileSync(`${jarviz_receiver_directory}/package.json`, 'utf8'));
		
	} catch (err) {
		//if (err) console.error(err);
		console.log("No local package.json found for jarviz-receiver.");
		return null;
	}
}

/*getRemotePackageJson().then((response)=>{
    console.log("response", response);
    console.log("response.version", response.version);
    console.log("package", package);
    
    console.log("JSON.stringify(package) === JSON.stringify(response)", JSON.stringify(package) === JSON.stringify(response));
    
}).catch((error)=>{
    console.error(error);
});*/

function getRemotePackageJson() {
	return new Promise((resolve, reject) => {
		var request = https.request(remotePackageJsonUrl, function (res) {
			
			var data = '';
			
			res.on('data', function (d) {
				data = data + d;
			});
			
			res.on('end', function () {
				var error = null;
				try {
					data = JSON.parse(data);
				} catch (e) {
					reject(e);
					return;
				}
				resolve(data);
			});
			
		});
		
		request.on('error', function (e) {
			reject(e);
		});
		
		request.end();
	})
}

async function download() {
	console.log(`Downloading update...`);
	
	return new Promise((resolve, reject) => {
		try {
			rimraf(jarviz_receiver_directory, ()=> {
				ghdownload({user: 'dmwallace', repo: 'jarviz-receiver', ref: 'master'}, jarviz_receiver_directory)
				.on('dir', function
				(dir) {
					console.log(`dir: ${dir}`)
				})
				.on('file', function (file) {
					console.log(`file: ${file}`)
				})
				.on('zip', function (zipUrl) { //only emitted if Github API limit is reached and the zip file is downloaded
					console.log(zipUrl)
				})
				.on('error', function (err) {
					console.error(`err: ${err}`);
					reject(err);
				})
				.on('end', function () {
					/*exec('tree', function (err, stdout, sderr) {
						 console.log(stdout)
					});*/
					console.log(`Installing...`);
					exec('npm install --production', {cwd: jarviz_receiver_directory}, (error, stdout, stderror) => {
						console.log(stdout);
						
						resolve();
					})
				});
			});
		} catch (err) {
			if (err) console.error(`error: ${err}`);
			reject();
		}
	});
}

function launch() {
	console.log(`Launching...`);
	
	let command = "node";
	let args = "build/jarviz-receiver.js";
	let cwd = jarviz_receiver_directory;
	
	jarviz_receiver = spawn(
		command,
		args.split(' '),
		{
			cwd
		}
	);
	
	jarviz_receiver.stdout.on('data', function (data) {
		console.log(data.toString());
	});
	jarviz_receiver.stderr.on('data', function (data) {
		console.log(data.toString());
	});
	jarviz_receiver.on('close', function (code) {
		console.log(`Child ${jarviz_receiver.spawnfile} PID: ${jarviz_receiver.pid} closed with code: ${code}`);
	});
	jarviz_receiver.on('error', (err) => {
		if (err) console.log(err);
		errors.push(err);
	});
}