const fsp = require('./fileSplitter.js'),
    cmd = require('./command.js'),
    amqpCmd = require('./amqpCommand.js'),
    gcfCmd = require('./gcfCommand.js'),
    awsLambdaCmd = require('./awsLambdaCommand.js'),
    scanDir = require('./DirScanner').scanDir;

function print(ins, outs, config, cb) {
        ins.forEach(function(input) {
        if (input.data && input.data[0].value) {
                    console.log(input.data[0].value);
        } else {
                    console.log(JSON.stringify(input, null, 2));
                }
        });
        cb(null, outs);
}

function print2(ins, outs, config, cb) {
    console.log("PRINT2");
    ins.forEach(function(input) {
        if (input.data.length === 1) {
            console.log(input.data[0]);
        } else {
            console.log(input.data);
        }
    });
    console.log("CONFIG");
    console.log(config);
    cb(null, outs);
}

function echo(ins, outs, config, cb) {
    JSON.stringify(ins[0].data);
    outs[0].data = [ins[0].data];
    cb(null, outs);
}

function echoWithDelay(ins, outs, config, cb) {
    outs[0].data = [ins[0].data];
    setTimeout(function() {
        cb(null, outs);
    }, Math.floor(Math.random()*1000+1));
}

function add(ins, outs, config, cb) {
    let sum = 0.0;
    for (let i=0; i<ins.length; ++i) {
        if ("value" in ins[i].data[0]) {
            sum += parseFloat(ins[i].data[0].value);
        }
    }
    outs[0].data = { "value": sum };
    cb(null, outs);
}

function sqr(ins, outs, config, cb) {
    if (!("value" in ins[0].data[0])) {
        outs[0].data = [ new Error("functions:sqr : no input value provided") ];
    } else {
        const v = parseFloat(ins[0].data[0].value);
        outs[0].data[0] = { "value": v * v };
    }
    cb(null, outs);
}

function length(ins, outs, config, cb) {
    if (!("value" in ins[0])) {
        outs[0].value = new Error("functions:sqr : no input value provided");
    } else {
        outs[0].value = ins[0].value.length;
    }
    setTimeout(function() {
        cb(null, outs);
    }, 1000);
}

function match(ins, outs, config, cb) {
    const tmp = ins[0].data[0].value.match(new RegExp('^/(.*?)/(g?i?m?y?)$'));
    const regex = new RegExp(tmp[1], tmp[2]);
    const str = ins[1].data[0].value;
    if (str.search(regex) !== -1) {
        outs[0].condition = "true";
        outs[0].data = [ str ];
    }
    cb(null, outs);
}

function chooseEvenOdd(ins, outs, config, cb) {
    let sum = 0;
    for (let i=0; i<ins.length; ++i) {
        if ("data" in ins[i] && "value" in ins[i].data[0]) {
            sum += parseInt(ins[i].data[0].value);
        }
    }
    if (sum % 2 === 0) {
        outs[0].data = [ { "value": sum } ];
        outs[0].condition = "true";
    } else {
        outs[1].data = [ { "value": sum } ];
        outs[1].condition = "true";
    }
    cb(null, outs);
}

function scanDirForJs(ins, outs, config, cb) {
    let inPath = ins[0].value, outPath;
    if (outs[0].path) {
        outPath = outs[0].path;
    } else {
        outPath = inPath + "/" + "matchingFilesOut.txt";
        outs[0].path = outPath;
    }
    scanDir(inPath, /.*js$/, outPath, function(err) {
        err ? cb(err): cb(null, outs);
    });
}

// TODO. (Currently only returns the input file path)
function grepFile(ins, outs, config, cb) {
    if (ins[0].path) {
        outs[0].value = ins[0].path;
    } else if (ins[0].value) {
        outs[0].value = ins[0].value;
    } else {
        cb(new Error("grepFile: input file path not provided."));
        return;
    }
    console.log("grepFile: '"+ ins[1].value+"'", outs[0].value);
    cb(null, outs); 
}

function count(ins, outs, config, cb) {
    outs[0].data = [];
    ins[0].data.forEach(function(cnt) {
        outs[0].data.push(cnt+1);
        if (cnt % 1000 === 0) {
            console.log("count:", cnt);
        }
        if (cnt === 5000) {
            process.exit();
        }
    });
    cb(null, outs);
}

function exit() {
  console.log("Exiting\n\n");
  process.exit(0);
}

function genCollection(ins, outs, config, cb) {
    const len = ins[0].data[0];
    outs[0].data = [];

    for (let i=0; i<len; i++) {
        outs[0].data.push(i+1);
    }

    console.log("GEN COLLECTION", outs[0].data);

    cb(null, outs);
}

function noop(ins, outs, config, cb) {
    cb(null, outs);
}

exports.print = print;
exports.print2 = print2;
exports.add = add;
exports.sqr = sqr;
exports.length = length;
exports.fileSplitter = fsp.fileSplitter;
exports.command = cmd.command;
exports.amqpCommand = amqpCmd.amqpCommand;
exports.exit = exit;
exports.command_print = cmd.command_print;
exports.command_notifyevents = cmd.command_notifyevents;
exports.gcfCommand = gcfCmd.gcfCommand;
exports.awsLambdaCommand = awsLambdaCmd.awsLambdaCommand;
exports.scanDirForJs = scanDirForJs;
exports.grepFile = grepFile;
exports.chooseEvenOdd = chooseEvenOdd;
exports.echo = echo;
exports.echoWithDelay = echoWithDelay;
exports.count = count;
exports.match = match;
exports.noop = noop;
exports.genCollection = genCollection;
