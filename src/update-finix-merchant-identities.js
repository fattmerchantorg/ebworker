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

const outputCsvStream = format({ headers: true });
const outputWriteStream = fs.createWriteStream("csv/output.csv");
outputCsvStream.pipe(outputWriteStream);

const whereIn = ` and m.id IN ()`;

const run = async () => {
  
  // Fetch rows from fatt where there is a valid Finix Identity
  const rows = await new Promise((resolve, reject) => {
    db().query(
      `
      select m.id, r.finix_identity_id, r.finix_merchant_id 
      from ${fattDbName}.merchants as m 
      join ${fattDbName}.registrations as r
        on m.id = r.merchant_id
      where m.brand != ?
      and m.brand != ?
      and brand != ''
      and brand is not null
      and m.is_payfac = 1
      and r.finix_identity_id != ""
      and r.finix_merchant_id IS NOT NULL
      and r.finix_merchant_id != ""
      and r.finix_merchant_id != "-"
      ${whereIn}
  `,
      ['fattmerchant', 'paymentdepot'],
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

  for (const row of rows) {
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
      o.error_identity = e && e.response && e.response.data && JSON.stringify(e.response.data);
      o.error_identity = o.error_identity ? o.error_identity : e;
      console.log(`Error PUT request for /identities/${row.finix_identity_id}`, e.response.data);
    }

    try {
      // Re-Provision Merchant
      await axios({
        url: `${process.env.FINIX_BASE_URL}/merchants/${row.finix_merchant_id}/verifications`,
        method: "post",
        data: {},
        headers,
      });
      console.log(`Provisioned For Finix Merchant ID: ${row.finix_merchant_id}`);
    } catch(e) {
      o.error_provision = e && e.response && e.response.data && JSON.stringify(e.response.data);
      o.error_provision = o.error_provision ? o.error_provision : e;
      console.log(`Error POST request for /merchants/${row.finix_merchant_id}/verifications`, e.response.data);
    }

    await new Promise((resolve) => setTimeout(resolve, 10000)); // sleep to write to csv and to prevent rate limit on Worldpay call

    outputCsvStream.write(o);
  }

  process.exit();
  
};

module.exports = { run };
