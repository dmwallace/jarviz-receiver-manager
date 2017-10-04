var ghdownload = require('github-download');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var rimraf = require('rimraf');
var https = require('https');
var fs = require('fs');

let jarviz_receiver_directory = `${__dirname}/../jarviz-receiver`;
let jarviz_receiver;

let remotePackageJsonUrl = `https://raw.githubusercontent.com/dmwallace/jarviz-receiver/master/package.json`;


checkForUpdate();

async function checkForUpdate() {
    let local = getLocalPackageJson();

    if(!local) {
        download(launch);
    } else {
        let remote = await getRemotePackageJson();

        if(JSON.stringify(local) !== JSON.stringify(remote)) {
            console.log(`Local and remote packages do not match... downloading remote`);
            download(launch);
        } else {
            console.log(`Local and remote packages are the same`);
            launch();
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

function download(callback) {
    console.log(`Downloading update...`);

    rimraf(jarviz_receiver_directory, function () {
        ghdownload({user: 'dmwallace', repo: 'jarviz-receiver', ref: 'master'}, jarviz_receiver_directory)
            .on('dir', function (dir) {
                console.log(dir)
            })
            .on('file', function (file) {
                console.log(file)
            })
            .on('zip', function (zipUrl) { //only emitted if Github API limit is reached and the zip file is downloaded
                console.log(zipUrl)
            })
            .on('error', function (err) {
                console.error(err)
            })
            .on('end', function () {
                /*exec('tree', function (err, stdout, sderr) {
                    console.log(stdout)
                });*/
                console.log(`Installing...`);
                exec('npm install --production', {cwd: jarviz_receiver_directory}, (error, stdout, stderror) => {
                    console.log(stdout);

                    callback();
                })
            });
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