# EB Worker

This script mocks the AWS SQSD process found in Elastic Beanstalk

When pointed to an SQS instance it will post the body of the message to a route that you specify - just like SQSD does for you in AWS.

Installation:

```
touch .env
npm install
```

Example .env file:

```
NODE_ENV=development
APP_ENV=local
APP_DEBUG=true

# For the EB worker
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_SQS_PREFIX=https://sqs.us-west-2.amazonaws.com/xxxxxxxxx
AWS_SQS_NAME=testing-queue-01
AWS_SQS_REGION=us-west-2

EBW_CHECK_INTERVAL_SECONDS=0
EBW_POST_URL=http://localhost:8000/ebworker/job
```

## Screenshot 


![screenshot](https://user-images.githubusercontent.com/15964/66140004-f9dff480-e5c6-11e9-842f-8b6e8759a5f3.png)