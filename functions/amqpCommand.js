const uuid = require('uuid');
const when = require('when');
const defer = when.defer;
const amqplib = require('amqplib');
const executor_config = require('./config/amqpCommand.config.js');

const identity = function (e) {
    return e
};


let connection = null;
let vmConnection = null;

function connect(url) {
    connection = amqplib.connect(url);
    console.log("[AMQP] Starting connection to " + url);

    connection.then(function (conn) {
        console.log("[AMQP] Connected!");

        return when(conn.createChannel().then(function (ch) {
            ch.assertQueue('hyperflow.jobs', {durable: true}).then(function (qok) {
                return qok.queue;
            });
        }));
    }, function (err) {
        console.error('[AMQP] Connect failed: %s', err);
    })
}

function vmConnect(url) {
    vmConnection = amqplib.connect(url);
    console.log("[AMQP] Starting connection to " + url);

    vmConnection.then(function (conn) {
        console.log("[AMQP] Connected!");

        return when(conn.createChannel().then(function (ch) {
            ch.assertQueue('hyperflow.jobs', {durable: true}).then(function (qok) {
                return qok.queue;
            });
        }));
    }, function (err) {
        console.error('[AMQP] Connect failed: %s', err);
    })
}

let taskCount = 0;

function amqpCommand(ins, outs, config, cb) {
    if (!connection) connect(executor_config.amqp_url);
    if (!vmConnection && !!executor_config.vm_amqp_url) vmConnect(executor_config.vm_amqp_url);

    let onFulfilled = function (connectionWrapper) {
        return when(connectionWrapper.conn.createChannel().then(function (ch) {
            const options = executor_config.options;
            if (config.executor.hasOwnProperty('options')) {
                const executorOptions = config.executor.options;
                for (const opt in executorOptions) {
                    if (executorOptions.hasOwnProperty(opt)) {
                        options[opt] = executorOptions[opt];
                    }
                }
            }


            if (!!config.deploymentType && options.vmDeploymentTypes.includes(config.deploymentType)
                && connectionWrapper.url === executor_config.vm_amqp_url) {
                console.log("VM DEPLOYMENT TYPE");
            } else if ((!!config.deploymentType && options.lambdaDeploymentTypes.includes(config.deploymentType)
                && connectionWrapper.url === executor_config.amqp_url) || !config.deploymentType) {
                // process normally
                console.log("LAMBDA DEPLOYMENT TYPE");
            } else if (!config.deploymentType && connectionWrapper.url === executor_config.vm_amqp_url) {
                console.log("VM DEPLOYMENT TYPE");
            } else {
                return;
            }

            if (connectionWrapper.url === executor_config.amqp_url) {
                console.log("LAMBDA CONNECTION")
            } else {
                console.log("VN CONNECTION")
            }

            const jobMessage = {
                "executable": config.executor.executable,
                "args": config.executor.args,
                "env": (config.executor.env || {}),
                "inputs": ins.map(identity),
                "outputs": outs.map(identity),
                "options": options
            };

            const answer = defer();
            const corrId = uuid.v4();

            function maybeAnswer(msg) {
                if (msg.properties.correlationId === corrId) {
                    answer.resolve(msg.content.toString());
                }
            }

            let ok = ch.assertQueue('', {exclusive: true, autoDelete: true})
                .then(function (qok) {
                    return qok.queue;
                });

            ok = ok.then(function (queue) {
                return ch.consume(queue, maybeAnswer, {noAck: true})
                    .then(function () {
                        return queue;
                    });
            });

            ok = ok.then(function (queue) {
                taskCount += 1;
                //  console.log("[AMQP][" + corrId + "][" + taskCount + "] Publishing job " + JSON.stringify(jobMessage));
                ch.sendToQueue('hyperflow.jobs', Buffer.from(JSON.stringify(jobMessage)), {
                    replyTo: queue,
                    contentType: 'application/json',
                    correlationId: corrId
                });
                return answer.promise;
            });

            return ok.then(function (message) {
                const parsed = JSON.parse(message);
                ch.close();
                //   if (parsed.exit_status === "0") {
                // console.log("[AMQP][" + corrId + "] Job finished! job[" + JSON.stringify(jobMessage) + "] msg[" + message + "]", outs);
                cb(null, outs);
                //    } else {
                if (JSON.stringify(jobMessage).executable === "mJPEG") {
                    const end = Date.now();
                    console.log("END: " + end);
                    console.log(queueName);
                }
                //   console.log("[AMQP][" + corrId + "] Error during job execution! msg[" + JSON.stringify(jobMessage) + "] job[" + message + "] exception[" + parsed.exceptions + "]");
                // process.exit(5);
                //  cb(parsed.exceptions, outs);
                // }
            });
        }))
    };
    connection.then(function (c) {
        return Promise.resolve({conn: c, url: executor_config.amqp_url})
    }).then(onFulfilled).then(null, function (err) {
        console.trace(err.stack);
    });
    if (vmConnection) {
        vmConnection.then(function (c) {
            return Promise.resolve({conn: c, url: executor_config.vm_amqp_url})
        }).then(onFulfilled).then(null, function (err) {
            console.trace(err.stack);
        });
    }
}


exports.amqpCommand = amqpCommand;
