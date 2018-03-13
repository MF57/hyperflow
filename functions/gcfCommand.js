const request = require('requestretry');
const executor_config = require('./config/gcfCommand.config.js');

function gcfCommand(ins, outs, config, hyperflow_callback) {

    function responseCallback(error, response, body) {
        console.log("Function: " + executable + " status: " + response.statusCode);

        if (error) {
            console.log("Function: " + executable + " error: " + error);
            hyperflow_callback(error, outs);
            return
        }
        if (response) {
            console.log("Function: " + executable + " response status code: " + response.statusCode + " number of request attempts: " + response.attempts)
        }
        console.log("Function: " + executable + " data: " + body.toString());
        hyperflow_callback(null, outs);
    }

    const options = executor_config.options;
    if (config.executor.hasOwnProperty('options')) {
        const executorOptions = config.executor.options;
        for (const opt in executorOptions) {
            if (executorOptions.hasOwnProperty(opt)) {
                options[opt] = executorOptions[opt];
            }
        }
    }
    const executable = config.executor.executable;
    const jobMessage = {
        "executable": executable,
        "args": config.executor.args,
        "env": (config.executor.env || {}),
        "inputs": ins,
        "outputs": outs,
        "options": options
    };

    console.log("Executing:  " + JSON.stringify(jobMessage));

    const requestBody = {
        timeout: 600000,
        url: executor_config.function_trigger_url,
        json: jobMessage,
        headers: {'Content-Type': 'application/json', 'Accept': '*/*'}
    };
    request.post(requestBody, responseCallback);
}

exports.gcfCommand = gcfCommand;