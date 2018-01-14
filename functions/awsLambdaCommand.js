// var request = require('request');
var request = require('requestretry');
// var executor_config = require('./functions/awsLambdaCommand.config.js');
var executor_config = require('./awsLambdaCommand.config.js');

var AWS = require('aws-sdk');
var s3 = new AWS.S3({ signatureVersion: 'v4' });
var lodash = require('lodash');
var async = require('async');

var identity = function (e) {
  return e
};

function awsLambdaCommand (ins, outs, config, cb) {
  var options = executor_config.options;
  if (config.executor.hasOwnProperty('options')) {
    var executorOptions = config.executor.options;
    for (var opt in executorOptions) {
      if (executorOptions.hasOwnProperty(opt)) {
        options[opt] = executorOptions[opt];
      }
    }
  }
  var executable = config.executor.executable;
  var jobMessage = {
    "executable": executable,
    "args": config.executor.args,
    "env": (config.executor.env || {}),
    "inputs": ins.map(identity),
    "outputs": outs.map(identity),
    "options": options
  };

  console.log("Executing:  " + JSON.stringify(jobMessage));
  var total_start = Date.now();

  var url = executor_config.aws_lambda_url;

  function optionalCallback(err, response, body) {
    if (response.attempts > 1) console.log('The number of request attempts: ' + response.attempts);

    var total_end;
    var duration;
    console.log("Function: " + executable + " status: " + response.statusCode);
    if (response.statusCode == 504) {
      console.log("Function: " + executable + " timeout!");
      checkOutputs(outs, 1);
    } else if (response.statusCode == 200) {
      total_end = Date.now();

      duration = total_end - total_start;
      var message = 'AWS Lambda Function exit: start ' + total_start + ' end ' + total_end + ' duration ' + duration + ' ms, executable: ' + executable;
      console.log("Function: " + executable + " data: " + message);
      cb(null, outs);
    } else {
      console.log(executable + " przypal! " + response.statusCode + " error: " + err + " body: " + jobMessage);
      cb('error', outs);
    }
  }
  
  function checkOutputs(outputs, attempt) {
    if (attempt > 30) {
      cb('timeout', outputs);
      return;
    }

    console.log("Function: " + executable);
    console.log("Attempt: " + attempt + " Checking following outputs: " + lodash.map(outputs, 'name'));
    var prefix = executor_config.options.prefix;

    async.parallel(
      lodash.map(outputs, function(file) {
        return function (callback) {
          var params = {
            Bucket: executor_config.options.bucket,
            Key: prefix + '/' + file.name
          };

          s3.headObject(params, function(err, data) {
            if (err) {
              console.log('error reading from s3: ' + params['Key']);
              callback(err, data);
            } else {
              console.log('Success reading from S3: ' + params['Key']);
              callback(null, data);
            }
          })
        }
      }),
      function(err, _results) {
        if (err) {
          console.log("Files missing, next attempt");
          setTimeout(checkOutputs, 10000, outputs, attempt + 1);
        } else {
          console.log("Files exist");
          total_end = Date.now();
          duration = total_end - total_start;
          var message = 'AWS Lambda Function exit: start ' + total_start + ' end ' + total_end + ' duration ' + duration + ' ms, executable: ' + executable;
          console.log("Function: " + executable + " data: " + message);

          cb(null, outputs);
        }
      }
    )
  }

  function retryStrategy(err, response, body){
    if (response.statusCode == 502 || response.statusCode == 400) {
      console.log("LOOOOOOOOOOL");
      console.log(executable + " Retrying");
      return true;
    }

    return false;
  }

  total_start = Date.now();
  request.post({
    timeout:600000,
    url:url,
    json:jobMessage,
    maxAttempts: 10,
    retryDelay: 5000,
    retryStrategy: retryStrategy,
    headers: {'Content-Type' : 'application/json', 'Accept': '*/*'}
  }, optionalCallback);
};

exports.awsLambdaCommand = awsLambdaCommand;