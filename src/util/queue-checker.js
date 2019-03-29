const AWS = require("aws-sdk");
const axios = require("axios");
const ora = require("ora");

const countdown = require("./countdown");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  apiVersions: {
    sqs: "2012-11-05"
  },
  region: process.env.AWS_SQS_REGION
});

const timestamp = () => {
  const date = new Date();
  return `[${date.toLocaleString()}]`;
};

const deleteMessage = async data => {
  const spinner = ora("deleting message from queue...").start();

  const sqs = new AWS.SQS();
  const queueUrl = process.env.AWS_SQS_PREFIX + "/" + process.env.AWS_SQS_NAME;

  const params = {
    QueueUrl: queueUrl,
    ReceiptHandle: data.Messages[0].ReceiptHandle
  };

  await sqs.deleteMessage(params, (error, data) => {
    spinner.stop();

    if (error) {
      spinner.fail(`${timestamp()} error deleting message: ${error}`);
    } else {
      spinner.succeed(`${timestamp()} deleted message`);
    }
  });
};

const postJob = async job => {
  const spinner = ora("posting job...").start();

  try {
    await axios({
      url: process.env.EBW_POST_URL,
      method: "post",
      data: job
    });

    spinner.succeed(`${timestamp()} posted job`);
  } catch (error) {
    spinner.fail(`${timestamp()} error posting job: ${error}`);
    // rethrow axios errors
    throw error.response.data;
  }
};

const checkQueue = async () => {
  const sqs = new AWS.SQS();
  const queueUrl = process.env.AWS_SQS_PREFIX + "/" + process.env.AWS_SQS_NAME;

  const spinner = ora("checking queue...").start();

  return new Promise(resolve => {
    sqs.receiveMessage(
      {
        QueueUrl: `${queueUrl}`,
        AttributeNames: ["All"],
        MaxNumberOfMessages: 1,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 0
      },
      async (error, data) => {
        if (error) {
          spinner.fail(
            `${timestamp()} received error checking queue: ${error}`
          );
        } else if (data && data.Messages) {
          spinner.succeed(`${timestamp()} received message from queue`);
          const job = JSON.parse(data.Messages[0].Body);
          await postJob(job);
          await deleteMessage(data);
        } else {
          spinner.info(`${timestamp()} received nothing from queue`);
        }

        resolve();
      }
    );
  });
};

const startChecking = () => {
  let ms = (process.env.EBW_CHECK_INTERVAL_SECONDS || 5) * 1000;
  let spinner = ora({ interval: 1000, spinner: "line" });

  countdown.start({
    ms: ms,
    onTick: elapsedTime => {
      const text = `checking queue in: ${(ms - elapsedTime) / 1000}s`;

      if (!spinner.isSpinning) {
        spinner.start(text);
      } else {
        spinner.text = text;
      }
    },
    onFinish: async () => {
      spinner.stop();
      await checkQueue();
      startChecking();
    }
  });
};

module.exports = { startChecking };
