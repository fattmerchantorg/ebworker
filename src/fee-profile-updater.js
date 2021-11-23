const axios = require("axios");
const ora = require("ora");
const fs = require("fs");
const csv = require("fast-csv");
const { format } = require("@fast-csv/format");
const { db } = require("../util/db-util");
// const Finix = require("./util/finix");
// const finixUtils = require("./util/finix-utils");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

const fetchFinixMerchant = async (mu) => {
  const res = await axios({
    url: `${process.env.FINIX_BASE_URL}/merchants/${mu}`,
    method: "get",
    headers,
  });
  return res.data;
};

const fetchFinixMerchantProfile = async (mp) => {
  const res = await axios({
    url: `${process.env.FINIX_BASE_URL}/merchant_profiles/${mp}`,
    method: "get",
    headers,
  });
  return res.data;
};

const fetchFeeProfile = async (fp) => {
  const res = await axios({
    url: `${process.env.FINIX_BASE_URL}/fee_profiles/${fp}`,
    method: "get",
    headers,
  });
  return res.data;
};

const postFeeProfile = async (body) => {
  const res = await axios({
    url: `${process.env.FINIX_BASE_URL}/fee_profiles`,
    method: "post",
    data: body,
    headers,
  });
  return res.data;
};

const putMerchantProfile = async (mp, body) => {
  const res = await axios({
    url: `${process.env.FINIX_BASE_URL}/merchant_profiles/${mp}`,
    method: "put",
    data: body,
    headers,
  });
  return res.data;
};

const getRegistration = async (pmid) => {
  return new Promise((resolve, reject) => {
    db().query(
      `
        SELECT * FROM fatt.registrations
        WHERE merchant_id = ?
        LIMIT 1`,
      [pmid],
      (error, rows) => {
        if (error) {
          reject(null);
        } else if (rows && rows[0]) {
          resolve(rows[0]);
        } else {
          resolve(null);
        }
      }
    );
  });
};

const run = async () => {
  const inputFile = "csv/amex-input.csv";

  let inputs = [];

  await new Promise((resolve) => {
    fs.createReadStream(inputFile)
      .pipe(csv.parse({ headers: true }))
      .on("error", (error) => console.log(error))
      .on("data", (row) => {
        inputs.push(row);
      })
      .on("end", resolve);
  });

  // inputs = inputs.slice(0, 1);

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
      await sleep(index * 200);

      const mu = input["Finix Merchant Number"];
      let mp = null;
      let fp = null;
      let nfp = null;

      if (!mu) return;

      try {
        // https://finix.live-payments-api.com/merchants/MU23G4hVSfXqJkDdXAiwAd2j
        const finixMerchant = await fetchFinixMerchant(mu);
        mp = finixMerchant.merchant_profile;

        // https://finix.live-payments-api.com/merchant_profiles/MP3vf8Q6YHGrt1ny8AQhzRLK
        const finixMerchantProfile = await fetchFinixMerchantProfile(mp);
        fp = finixMerchantProfile.fee_profile;

        // https://finix.live-payments-api.com/fee_profiles/FPp7oomtbR4dA8SVxitLaFoQ
        const finixFeeProfile = await fetchFeeProfile(fp);

        const newFeeProfilePayload = {
          ...finixFeeProfile,
          american_express_basis_points: 60,
        };

        delete newFeeProfilePayload.id;
        delete newFeeProfilePayload._links;

        const newFeeProfile = await postFeeProfile(newFeeProfilePayload);
        nfp = newFeeProfile.id;

        await putMerchantProfile(mp, { fee_profile: nfp });

        const o = {
          MU: mu,
          MP: mp,
          FP: fp,
          NFP: nfp,
          error: null,
        };

        console.log(o);

        count++;

        outputCsvStream.write(o);
      } catch (error) {
        const o = {
          MU: mu,
          MP: mp,
          FP: fp,
          NFP: nfp,
          error: `${error}`,
        };
        console.log(o);
        errorCsvStream.write(o);
      }

      console.log(`${count}/${inputs.length}`);
    })
  );

  console.log(
    "successfully updated",
    count,
    "rows",
    "out of",
    inputs.length,
    "read rows"
  );
  process.exit();
};

module.exports = { run };
