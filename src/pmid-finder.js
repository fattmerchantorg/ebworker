const axios = require("axios");
const ora = require("ora");
const fs = require("fs");
const csv = require("fast-csv");
const { format } = require("@fast-csv/format");
const { db } = require("../util/db-util");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getMerchantIdFromMerchantGateways = async (mu) => {
  return new Promise((resolve, reject) => {
    console.log("  querying for", mu, "through merchant_gateways");
    db().query(
      `
        SELECT mg.merchant_id FROM fatt.merchant_gateways AS mg
        WHERE mg.name LIKE "finix%"
        AND JSON_VALID(mg.keys)
        AND JSON_VALID(mg.keys->"$.credentials")
        AND JSON_VALID(mg.keys->"$.credentials.finixMerchantId")
        AND mg.keys->"$.credentials.finixMerchantId" = ?
        LIMIT 1`,
      [mu],
      (error, rows) => {
        if (error) {
          reject(null);
        } else if (rows && rows[0]) {
          resolve(rows[0].merchant_id);
        } else {
          resolve(null);
        }
      }
    );
  });
};

const getMerchantIdFromRegistrations = async (mu) => {
  return new Promise((resolve, reject) => {
    console.log("  querying for", mu, "through registrations");
    db().query(
      `
        SELECT r.merchant_id FROM fatt.registrations AS r
        WHERE r.finix_merchant_id = ?
        LIMIT 1`,
      [mu],
      (error, rows) => {
        if (error) {
          reject(null);
        } else if (rows && rows[0]) {
          resolve(rows[0].merchant_id);
        } else {
          resolve(null);
        }
      }
    );
  });
};

const mapActionToChangedRegistrationFields = (action) => {
  const newValue = action.match(/(?<=to)(.*?)(bps)/s)[1].trim();

  return {
    // CNP Discount Fees
    plan_dcamnt: newValue,
    // CP Discount Fees
    cp_transaction_rate: newValue,
    // Credit Qual Disc Rate
    credit_qual_disc_rate: newValue,
    // Credit Mid Disc Rate
    credit_mid_disc_rate: newValue,
    // Credit Non Disc Rate
    credit_non_disc_rate: newValue,
  };
};

const mapActionToChangedAmexRegistrationFields = (action) => {
  const newValue = action.match(/(?<=to)(.*?)(bps)/s)[1].trim();

  return {
    // CNP Amex Discount Fees
    amex_mid_disc_rate: newValue,
    // CP Amex Discount Fees
    cp_amex_rate: newValue,
    // Amex Qual Disc Rate
    amex_qual_disc_rate: newValue,
    // Amex Mid Disc Rate
    amex_mid_disc_rate: newValue,
    // Amex Non Disc Rate
    amex_non_disc_rate: newValue,
  };
};

const run = async () => {
  const inputFile = "csv/input.csv";

  let inputs = [];

  await new Promise((resolve) => {
    fs.createReadStream(inputFile)
      .pipe(csv.parse({ headers: true }))
      .on("error", (error) => console.log(errorerror))
      .on("data", (row) => {
        inputs.push(row);
      })
      .on("end", resolve);
  });

  console.log(`found ${inputs.length} rows in csv`);

  const outputCsvStream = format({ headers: true });
  const outputWriteStream = fs.createWriteStream("csv/output.csv");
  outputCsvStream.pipe(outputWriteStream);

  const errorCsvStream = format({ headers: true });
  const errorWriteStream = fs.createWriteStream("csv/error.csv");
  errorCsvStream.pipe(errorWriteStream);

  let count = 0;

  await Promise.all(
    inputs.map(async (input, index) => {
      const mu = input["MU"];

      console.log("- querying for MU", mu);
      if (!mu) return;

      try {
        let merchantId = await getMerchantIdFromRegistrations(mu);

        if (!merchantId) {
          merchantId = await getMerchantIdFromMerchantGateways(mu);
        }

        if (merchantId) {
          console.log("  found pmid", merchantId);

          const output = {
            // ...input,
            merchant_id: merchantId,
            // ...mapActionToChangedAmexRegistrationFields(action),
            // index,
            mu,
          };

          // if (output.amex_mid_disc_rate != "60") {
          //   console.log("  error THIS ONE IS WRONG", merchantId, mu);
          //   process.exit();
          // }

          count++;

          outputCsvStream.write(output);
        } else {
          console.log("  error COULD NOT FIND MERCHANT FOR MU", mu);
          errorCsvStream.write({ mu });
        }
      } catch (error) {
        console.log("  error error", error);
        errorCsvStream.write({ mu });
      }
    })
  );

  console.log("wrote", count, "rows", "out of", inputs.length, "read rows");
  process.exit();
};

module.exports = { run };
