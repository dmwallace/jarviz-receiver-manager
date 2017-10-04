var ghdownload = require('github-download');
var exec = require('child_process').exec;
var spawn = require('child_process').spawn;
var rimraf = require('rimraf');

let jarviz_receiver_directory = `${__dirname}/../jarviz-receiver`;
let jarviz_receiver;

rimraf(jarviz_receiver_directory, function () {
    download();
});

function download() {
    console.log(`Downloading update...`);


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

                launch();
            })
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