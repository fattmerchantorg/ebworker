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

const fattDbName = process.env.DB_DATABASE;

let paginateFrom = 0;
let paginateTo = 500;

const run = async () => {
  // Fetch rows from fatt where there is a valid Finix Identity
  const rows = await new Promise((resolve, reject) => {
    db().query(
      `
      select r.finix_identity_id, r.finix_merchant_id 
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
  
  for (const row of rows) {
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
      console.log('Error PUT request for /identities', e);
    }
  }

  paginateFrom = paginateFrom + 500;
  paginateTo = paginateTo + 500;

  await new Promise((resolve) => setTimeout(resolve, 2000));

  run();
  
};

module.exports = { run };
