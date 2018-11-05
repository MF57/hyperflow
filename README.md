# HyperFlow: a distributed workflow execution engine

## Description

HyperFlow provides a model of computation, workflow description language and enactment engine for complex, distributed workflows.

Browse the [wiki pages](https://github.com/balis/hyperflow/wiki) to learn more about the HyperFlow workflow model. 

## Getting started

The latest release of HyperFlow is 1.1.0

### Installation
* Install Node.js (http://nodejs.org)
* Install Redis (http://redis.io) 
* Install HyperFlow:<br>`npm install https://github.com/dice-cyfronet/hyperflow/archive/1.1.0.tar.gz`

### Running
* Start the redis server: `redis-server`
* Go to hyperflow directory: `cd node_modules/hyperflow`
* Run example workflows using command `hflow run <wf_directory>`, for example:<br>```./bin/hflow run ./examples/Sqrsum```
* Optionally, you can add directory `<hyperflow_root_dir>/bin` to your system `PATH`

### AWS Lambda Command

```
exports.function_trigger_url = LAMBDA_URL;

exports.options = {
    "storage": "s3",
    "bucket": S3_BUCKET,
    "prefix": S3_PATH,
    "verbose": false,
    "metrics": true
};

```

### Google Cloud Function Command

```
exports.function_trigger_url = GCF_URL;

exports.options = {
    "storage": "google",
    "bucket": GOOGLE_BUCKET,
    "prefix": GOOGLE_PATH,
    "verbose": false
};

```

### AMQP Command

```
exports.amqp_data = [
    {
        url: VM_AMQP_URL,
        deploymentTypes: ["vm"]
    },
    {
        url: AMQP_URL,
        deploymentTypes: ["lambda"]
    }
];

exports.options = {
    "storage": "cloud",
    "workdir": "path", 
    "bucket": S3_BUCKET,
    "prefix": S3_PATH,
    "verbose": true
};
```


