const axios = require("axios");
const ora = require("ora");
const fs = require("fs");
const csv = require("fast-csv");
const { format } = require("@fast-csv/format");
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
  const start = "2021-08-01 00:00:00";
  const end = "2021-12-01 00:00:00";
  const rows = await new Promise((resolve, reject) => {
    db().query(
      `
      SELECT ps.id, ps.external_id 
      FROM fatt.processed_settlements AS ps
      WHERE ps.created_at BETWEEN ? AND ?
      AND ps.window_start_at IS NULL
  `,
      [start, end],
      (error, rows) => {
        if (error) {
          reject(error);
        } else {
          resolve(rows);
        }
      }
    );
  });

  // return console.log(rows);

  await Promise.all(
    rows.map(async (row) => {
      const settlement = await fetchSingleFinixSettlement(row.external_id);
      const bindings = [
        settlement.window_start
          ? settlement.window_start.slice(0, 19).replace("T", " ")
          : null,
        settlement.window_end
          ? settlement.window_end.slice(0, 19).replace("T", " ")
          : null,
        row.id,
      ];

      await new Promise((resolve, reject) => {
        db().query(
          `
          UPDATE fatt.processed_settlements
          SET window_start_at = ?, window_end_at = ?
          WHERE id = ?
        `,
          bindings,
          (error, result) => (error ? reject(error) : resolve(result))
        );
      });
    })
  );
};

module.exports = { run };
