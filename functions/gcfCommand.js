const request = require('requestretry');
const executor_config = require('./config/gcfCommand.config.js');

function gcfCommand(ins, outs, config, hyperflow_callback) {

    const beginTime = new Date().getTime();


    function responseCallback(error, response, body) {
        console.log("Function: " + executable + " response status code: " + response.statusCode + " number of request attempts: " + response.attempts);

        if (error || response.statusCode !== 200) {
            console.log("Function: " + executable + " error: " + error);
            console.log(response.body);
            hyperflow_callback(error, outs);
            process.exit(5);
            return
        }
        if (executor_config.options.verbose) {
            console.log("Function: " + executable + " data: " + body.toString());
        }

        if (executor_config.options.metrics) {
            const endTime = new Date().getTime();
            const fs = require('fs');

            fs.appendFile('metrics.csv', executable + "," + beginTime + "," + endTime + "\n", function (err) {
                if (err) throw err;
            });

        }
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
        "options": options,
        "verbose": executor_config.options.verbose
    };

    if (executor_config.options.verbose) {
        console.log("Executing:  " + JSON.stringify(jobMessage));
    }

    function myRetryStrategy(err, response){
        // retry the request if we had an error or if the response was a 'Bad Gateway'
        if (response && response.statusCode && response.statusCode !== 200) {
            console.log(executable + " - " + response.statusCode + " - " + response.body);
        }
        return err || !response || response.statusCode !== 200;
    }

    const requestBody = {
        timeout: 600000,
        url: executor_config.function_trigger_url,
        json: jobMessage,
        maxAttempts: 5,
        retryDelay: 5000,
        retryStrategy: myRetryStrategy,
        headers: {'Content-Type': 'application/json', 'Accept': '*/*'}
    };
    request.post(requestBody, responseCallback);
}

exports.gcfCommand = gcfCommand;