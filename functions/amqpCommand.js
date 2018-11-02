const uuid = require('uuid');
const when = require('when');
const defer = when.defer;
const amqplib = require('amqplib');
const executor_config = require('./config/amqpCommand.config.js');

const identity = function (e) {
    return e
};


let connections = new Array(executor_config.amqp_data.length).fill(null);
let connectionsMap = executor_config.amqp_data.map((data, i) => [data, connections[i]]);


function connect(connection, url, index) {
    connection = amqplib.connect(url);
    console.log("[AMQP] Starting connection to " + url);
    connectionsMap[index][1] = connection;

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

let taskCount = 0;

function amqpCommand(ins, outs, config, cb) {
    connectionsMap.filter(c => !c[1]).forEach((connectionEntry, index) => {
        connect(connectionEntry[1], connectionEntry[0].url, index)
    });

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

            const jobMessage = {
                "executable": config.executor.executable,
                "args": config.executor.args,
                "env": (config.executor.env || {}),
                "inputs": ins.map(identity),
                "outputs": outs.map(identity),
                "options": options,
                "verbose": executor_config.options.verbose
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
                if (executor_config.options.verbose) {
                    console.log("[AMQP][" + corrId + "][" + taskCount + "] Publishing job " + JSON.stringify(jobMessage));
                } else {
                    console.log("[AMQP][" + corrId + "] Publishing job " + config.executor.executable);
                }
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
                if (parsed.exit_status === 0 || !parsed.error) {
                    if (executor_config.options.verbose) {
                        console.log("[AMQP][" + corrId + "] Job finished! job[" + JSON.stringify(jobMessage) + "] msg[" + message + "]", outs);
                    } else {
                        console.log("[AMQP][" + corrId + "] Successfully finished job " + config.executor.executable);
                    }
                    cb(null, outs);
                } else if (connectionsMap.map(c => c.url).indexOf(connectionWrapper.url) === 0) {
                    console.log("[AMQP][" + corrId + "] Error during job execution in default queue! exception[" + parsed.error + "] - quitting");
                    cb(parsed.error, outs);
                    process.exit(5);
                } else {
                    console.log("[AMQP][" + corrId + "] Error during job execution! exception[" + parsed.error + "] - retrying in default queue");
                    connectionsMap[0][1].then(function (c) {
                        return Promise.resolve({conn: c, url: connectionsMap[0][0].url})
                    }).then(onFulfilled).then(null, function (err) {
                        console.trace(err.stack);
                    });
                }
            });
        }))
    };

    connectionsMap.filter(connectionEntry => connectionEntry[0].deploymentTypes.includes(config.deploymentType)).forEach(connectionEntry => {
        connectionEntry[1].then(function (c) {
            return Promise.resolve({conn: c, url: connectionEntry[0].url})
        }).then(onFulfilled).then(null, function (err) {
            console.trace(err.stack);
        });
    });




}


exports.amqpCommand = amqpCommand;
