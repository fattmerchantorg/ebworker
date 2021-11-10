const axios = require("axios");
const { db } = require("../util/db-util");

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

const run = async () => {
  const start = "2021-05-01 00:00:00";
  const end = "2021-12-01 00:00:00";
  const limit = 200;

  const rows = await new Promise((resolve, reject) => {
    db().query(
      `
      SELECT ps.id, ps.external_id 
      FROM fatt.processed_settlements AS ps
      WHERE ps.created_at BETWEEN ? AND ?
      AND ps.external_created_at IS NULL
      LIMIT ?
  `,
      [start, end, limit],
      (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows);
        }
      }
    );
  });

  if (!rows.length) {
    console.log("no results");
    process.exit();
  }

  // return console.log(rows);

  await Promise.all(
    rows.map(async (row) => {
      const settlement = await fetchSingleFinixSettlement(row.external_id);
      const bindings = [
        settlement.created_at
          ? settlement.created_at.slice(0, 19).replace("T", " ")
          : null,
        row.id,
      ];

      await new Promise((resolve, reject) => {
        db().query(
          `
          UPDATE fatt.processed_settlements
          SET external_created_at = ?
          WHERE id = ?
        `,
          bindings,
          (error, result) => (error ? reject(error) : resolve(result))
        );
      });
    })
  );

  process.exit();
};

module.exports = { run };
