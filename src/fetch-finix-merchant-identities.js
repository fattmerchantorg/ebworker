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

const whereIn = ` WHERE m.id IN ()`;

const run = async () => {
  
  const rows = await new Promise((resolve, reject) => {
    db().query(
      `
      select m.id, r.finix_identity_id, r.finix_merchant_id, m.status
      from ${fattDbName}.merchants as m 
      join ${fattDbName}.registrations as r
        on m.id = r.merchant_id
      ${whereIn}
  `,
      [],
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


  // of the rejected and provisioning, GET 
  // "processing_enabled"
  // "settlement_enabled"
  console.log('PMID,FinixIdentityId,FinixMerchantId,OnboardingState,MerchantStatus,ProcessingEnabled,SettlementEnabled,GrossSettlementEnabled,MaxTransAmount');
  for (const row of rows) {
    try {
      // Update the merchant identity in FINIX
      const {data} = await axios({
        url: `${process.env.FINIX_BASE_URL}/merchants/${row.finix_merchant_id}`,
        method: "get",
        headers,
      });

      const {data: idenData}  = await axios({
        url: `${process.env.FINIX_BASE_URL}/identities/${row.finix_identity_id}`,
        method: "get",
        headers,
      });
      console.log(`${row.id},${row.finix_identity_id},${row.finix_merchant_id},${data.onboarding_state},${row.status},${data.processing_enabled},${data.settlement_enabled},${data.gross_settlement_enabled},${idenData.entity.max_transaction_amount}`);
    } catch(e) {
      console.log(e);
    }
  }

  process.exit();
};

module.exports = { run };
