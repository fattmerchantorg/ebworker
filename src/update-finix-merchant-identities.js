const axios = require("axios");
const { db } = require("../util/db-util");
const csv = require("fast-csv");
const { format } = require("@fast-csv/format");
const fs = require("fs");

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

const fattDbName = process.env.DB_DATABASE;

let paginateFrom = 0;
let paginateTo = 500;

const run = async () => {
  const outputCsvStream = format({ headers: true });
  const outputWriteStream = fs.createWriteStream("csv/output.csv");
  outputCsvStream.pipe(outputWriteStream);

  // Fetch rows from fatt where there is a valid Finix Identity
  const rows = await new Promise((resolve, reject) => {
    db().query(
      `
      select m.id, r.finix_identity_id, r.finix_merchant_id 
      from ${fattDbName}.merchants as m 
      join ${fattDbName}.registrations as r
        on m.id = r.merchant_id
      where m.brand != ?
      and m.is_payfac = 1
      and r.finix_identity_id != ""
      limit ?,?
  `,
      ['fattmerchant', paginateFrom, paginateTo],
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


  await Promise.all(rows.map(async (row, index) => {
    outputCsvStream.write({
      hello: index
    });
  }));

  process.exit();

  for (const row of rows) {
    outputCsvStream.write({
      hello: 'world'
    });
    continue;
    let o = {
      PMID: row.id,
      finix_identity_id: row.finix_identity_id,
      finix_merchant_id: row.finix_merchant_id,
      error_identity: null,
      error_provision: null
    };
    try {
      // Update the merchant identity in FINIX
      await axios({
        url: `${process.env.FINIX_BASE_URL}/identities/${row.finix_identity_id}`,
        data: {
          entity: {
            max_transaction_amount: 50000000, // Up transaction limit to $500,000
          }
        },
        method: "put",
        headers,
      });
      console.log(`Updated Transaction Limit For Indentity ID: ${row.finix_identity_id}`);
      
    } catch(e) {
      // o.error_identity = e && e.response && e.response.data && JSON.stringify(e.response.data);
      // o.error_identity = o.error_identity ? o.error_identity : e;
      console.log('Error PUT request for /identities/:ID', e);
    }

    try {
      // Re-Provision Merchant
      await axios({
        url: `${process.env.FINIX_BASE_URL}/merchants/${row.finix_merchant_id}/verifications`,
        method: "post",
        data: {},
        headers,
      });
      console.log(`Provisioned For Finix Merchant ID: ${row.finix_identity_id}`);
    } catch(e) {
      // o.error_provision = e && e.response && e.response.data && JSON.stringify(e.response.data);
      // o.error_provision = o.error_provision ? o.error_provision : e;
      console.log('Error POST request for /merchants/:ID/verifications', e);
    }
  }

  paginateFrom = paginateFrom + 500;
  paginateTo = paginateTo + 500;

  await new Promise((resolve) => setTimeout(resolve, 2000));

  run();
  
};

module.exports = { run };
