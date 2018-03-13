const request = require('requestretry');
const executor_config = require('./config/gcfCommand.config.js');
const identity = function (e) {
    return e
};


function gcfCommand(ins, outs, config, cb) {

    const options = executor_config.options;
    if(config.executor.hasOwnProperty('options')) {
        const executorOptions = config.executor.options;
        for (const opt in executorOptions) {
            if(executorOptions.hasOwnProperty(opt)) {
                options[opt] = executorOptions[opt];
            }
        }
    }
    const executable = config.executor.executable;
    const jobMessage = {
        "executable": executable,
        "args": config.executor.args,
        "env": (config.executor.env || {}),
        "inputs": ins.map(identity),
        "outputs": outs.map(identity),
        "options": options
    };

    console.log("Executing:  " + JSON.stringify(jobMessage));

    const url = executor_config.gcf_url;

    function optionalCallback(err, response, body) {
        if (err) {
            console.log("Function: " + executable + " error: " + err);
            cb(err, outs);
            return
        }
        if (response) {
             console.log("Function: " + executable + " response status code: " + response.statusCode + " number of request attempts: " + response.attempts)
        }
        console.log("Function: " + executable + " data: " + body.toString());
        cb(null, outs);
    }


    request.post(
        {
            timeout: 600000,
            url: url,
            json: jobMessage,
            headers: {'Content-Type': 'application/json', 'Accept': '*/*'}
        }, optionalCallback);


}


exports.gcfCommand = gcfCommand;