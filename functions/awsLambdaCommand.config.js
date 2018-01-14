var LAMBDA_URL  = process.env.LAMBDA_URL ? process.env.LAMBDA_URL : "https://zy3ayr4w56.execute-api.eu-central-1.amazonaws.com/prod/montageAwsLambda";
//var GCF_URL  = process.env.GCF_URL ? process.env.GCF_URL :  'http://localhost:2000'

var S3_BUCKET = process.env.S3_BUCKET ? process.env.S3_BUCKET : "mf57storage";
var S3_PATH   = process.env.S3_PATH ? process.env.S3_PATH : "data/0.25/input"; //prefix in a bucket with no leading or trailing slashes

exports.aws_lambda_url = LAMBDA_URL;

exports.options = {
     "storage": "s3",
     "bucket": S3_BUCKET,
     "prefix": S3_PATH
 };

