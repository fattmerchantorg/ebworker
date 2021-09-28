const AWS = require("aws-sdk");
const axios = require("axios");
const ora = require("ora");

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

const postJob = async (id, job) => {
  const spinner = ora("posting job...").start();

  try {
    await axios({
      url: process.env.EBW_POST_URL,
      method: "post",
      data: job,
      headers: {
        "X-Aws-Sqsd-Msgid": id
      }
    });

    spinner.succeed(`${timestamp()} posted job to ${process.env.EBW_POST_URL}`);
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
          const { MessageId: id, Body: job }  = data.Messages[0];
          spinner.succeed(`Message received: ${id}`);
          await postJob(id, JSON.parse(job));
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
  let interval = null;
  let elapsedTime = 0;
  const ms = (process.env.EBW_CHECK_INTERVAL_SECONDS || 5) * 1000;
  const spinner = ora({ spinner: "line" });

  const setSpinnerText = () => {
    spinner.text = `checking queue in: ${(ms - elapsedTime) / 1000}s`;
    spinner.render();
  };

  const onFinish = async () => {
    clearInterval(interval);
    await checkQueue();
    startChecking();
  };

  const onTick = async () => {
    elapsedTime += 1000;
    setSpinnerText();
    if (elapsedTime >= ms) onFinish();
  };

  setSpinnerText();

  interval = setInterval(onTick, 1000);
};

module.exports = { startChecking };
