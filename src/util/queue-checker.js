const AWS = require("aws-sdk");
const axios = require("axios");

const deleteMessage = async () => {
  const sqs = new AWS.SQS();
  const queueUrl = process.env.AWS_SQS_PREFIX + "/" + process.env.AWS_SQS_NAME;
  const params = {
    QueueUrl: queueUrl,
    ReceiptHandle: data.Messages[0].ReceiptHandle
  };

  await sqs.deleteMessage(params, (error, data) => {
    if (error) {
      console.error(error);
    } else {
      console.log("deleted message");
    }
  });
};

const postJob = job => {
  return axios({
    url: process.env.EBW_WORKER_URL,
    method: "post",
    data: job
  })
    .then(function(result) {
      return result.data;
    })
    .catch(function(error) {
      // rethrow axios errors
      throw get(error, "response.data");
    });
};

const checkQueue = async () => {
  const sqs = new AWS.SQS();
  const queueUrl = process.env.AWS_SQS_PREFIX + "/" + process.env.AWS_SQS_NAME;

  console.log("checking queue");

  try {
    await sqs.receiveMessage(
      {
        QueueUrl: `${queueUrl}`,
        AttributeNames: ["All"],
        MaxNumberOfMessages: 1,
        VisibilityTimeout: 20,
        WaitTimeSeconds: 0
      },
      async (error, data) => {
        if (error) {
          console.error("got error", error);
          throw error;
        } else if (data.Messages) {
          console.log("got messages", data.Messages.length);

          await deleteMessage(sqs, deleteParams);
          const job = JSON.parse(data.Messages[0].Body);
          postJob(job);
        } else {
          console.log('nothing in queue')
        }
      }
    );
  } catch (error) {
    console.error(error);
  }
};

module.exports = {
  startChecking: () => {
    AWS.config.update({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      apiVersions: {
        sqs: "2012-11-05"
      },
      region: process.env.AWS_SQS_REGION
    });

    setInterval(checkQueue, process.env.EBW_CHECK_INTERVAL || 5000);
  }
};
