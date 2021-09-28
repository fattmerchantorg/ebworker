const AWS = require("aws-sdk");
const axios = require("axios");
const ora = require("ora");
const fs = require("fs");
const csv = require("fast-csv");
const { format } = require("@fast-csv/format");

const basicAuth = (finixAccessId, finixSecureKey) =>
  `Basic ${Buffer.from(`${finixAccessId}:${finixSecureKey}`).toString(
    "base64"
  )}`;

const finixHeaders = (finixAccessId, finixSecureKey) => ({
  "Content-Type": "application/json",
  Authorization: basicAuth(finixAccessId, finixSecureKey),
});

/**
 * Declare the Finix Request headers
 * which are required for all finix api calls
 */
const headers = finixHeaders(
  `${process.env.FINIX_USERNAME}`,
  `${process.env.FINIX_PASSWORD}`
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchSingleFinixSettlement = async (settlementId) => {
  const finixRecordsRequest = await axios({
    url: `${process.env.FINIX_BASE_URL}/settlement_engine/settlements/${settlementId}`,
    method: "get",
    headers,
  });
  return finixRecordsRequest.data;
};

const writeCsv = async () => {
  const inputFile = "csv/reprocess_settlements.csv";

  const results = [];

  await new Promise((resolve) => {
    fs.createReadStream(inputFile)
      .pipe(csv.parse({ headers: true }))
      .on("error", (error) => console.error(error))
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", resolve);
  });

  console.log(`found ${results.length} rows in csv`);

  const csvStream = format({ headers: true });
  const writeStream = fs.createWriteStream("csv/output.csv");
  csvStream.pipe(writeStream);

  let count = 0;

  await results.reduce(async (previousPromise, result) => {
    // await previousPromise;

    try {
      console.log("querying for settlement", result.external_id);
      const settlement = await fetchSingleFinixSettlement(result.external_id);
      const finix_merchant_id = settlement.merchant;
      const row = {
        external_id: result.external_id,
        finix_merchant_id: finix_merchant_id,
      };

      count++;

      csvStream.write(row);
    } catch (error) {}
  }, Promise.resolve());

  console.log("wrote", count, "rows");

  // await Promise.all(
  //   results.map(async (result) => {
  //     try {
  //       const settlement = await fetchSingleFinixSettlement(result.external_id);
  //       const finix_merchant_id = settlement.merchant;
  //       const row = {
  //         external_id: result.external_id,
  //         finix_merchant_id: finix_merchant_id,
  //       };

  //       csvStream.write(row);
  //     } catch (error) {
  //       console.log("error");
  //     }
  //   })
  // );
};

module.exports = { writeCsv };
