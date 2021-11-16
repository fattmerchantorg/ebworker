const { db } = require("../util/db-util");

const skipIds = [
  // "SF11ec231db7727c83972a4bbc4ad15054",
  // "SF11ec231db772cab2972a4bbc4ad15054",
  // "SF11ec231db772f1b6972a4bbc4ad15054",
  // "SF11ec257935d980c0a656ffe8bebda526",
  // "SF11ec257935d980c6a656ffe8bebda526",
  // "SF11ec257935d9cee8a656ffe8bebda526",
  // "SF11ec2579557ae275972a4bbc4ad15054",
  // "SF11ec2579557ae276972a4bbc4ad15054",
  // "SF11ec2579557b3091972a4bbc4ad15054",
  // "SF11ec270b2b1199a0972a4bbc4ad15054",
  // "SF11ec270b2bc53230972a4bbc4ad15054",
  // "SF11ec270b754a9b74972a4bbc4ad15054",
  // "SF11ec270b754ac286972a4bbc4ad15054",
  // "SF11ec270b80ed4680a656ffe8bebda526",
  // "SF11ec270b80ed4683a656ffe8bebda526",
  // "SF11ec270b80ed6d9ca656ffe8bebda526",
  // "SF11ec270b9193f885972a4bbc4ad15054",
  // "SF11ec270c0b163bb4a656ffe8bebda526",
  // "SF11ec270c0b1662c2a656ffe8bebda526",
  // "SF11ec270c0b16fef4a656ffe8bebda526",
  // "SF11ec2d565385394ba8ab1db97b6e7b10",
  // "SF11ec2d565385394ca8ab1db97b6e7b10",
  // "SF11ec2d56544aac20a8ab1db97b6e7b10",
  // "SF11ec2d565465ae31a8ab1db97b6e7b10",
  // "SF11ec2d565465ae33a8ab1db97b6e7b10",
  // "SF11ec2d5655bba142a8ab1db97b6e7b10",
  // "SF11ec2d5656cc7504a8ab1db97b6e7b10",
  // "SF11ec2d5656cc7506a8ab1db97b6e7b10",
  // "SF11ec2d56573ebed0a8ab1db97b6e7b10",
  // "SF11ec2d56573ebed1a8ab1db97b6e7b10",
  // "SF11ec2d56574352c2a8ab1db97b6e7b10",
  // "SF11ec2d56574352c3a8ab1db97b6e7b10",
  // "SF11ec2d56575505f3a8ab1db97b6e7b10",
  // "SF11ec2d56575505f4a8ab1db97b6e7b10",
  // "SF11ec2d56575f3f25a8ab1db97b6e7b10",
  // "SF11ec2d56575f3f27a8ab1db97b6e7b10",
  // "SF11ec2d5657675574a8ab1db97b6e7b10",
  // "SF11ec2d5657677c83a8ab1db97b6e7b10",
  // "SF11ec2d56577426b8a8ab1db97b6e7b10",
  // "SF11ec2d56577426b9a8ab1db97b6e7b10",
  // "SF11ec2d565774ea00a8ab1db97b6e7b10",
  // "SF11ec2d565774ea02a8ab1db97b6e7b10",
  // "SF11ec2d56577c15f6a8ab1db97b6e7b10",
  // "SF11ec2d56577c15faa8ab1db97b6e7b10",
  // "SF11ec2d56577c15fda8ab1db97b6e7b10",
  // "SF11ec2d56577e5fe0a8ab1db97b6e7b10",
  // "SF11ec2d56577e5fe2a8ab1db97b6e7b10",
  // "SF11ec2d56577e5fe4a8ab1db97b6e7b10",
  // "SF11ec2d56578368f4a8ab1db97b6e7b10",
  // "SF11ec2d56578368f5a8ab1db97b6e7b10",
  // "SF11ec2d56578368faa8ab1db97b6e7b10",
  // "SF11ec2d565786c454a8ab1db97b6e7b10",
  // "SF11ec2d565786c451a8ab1db97b6e7b10",
  // "SF11ec2d565786c455a8ab1db97b6e7b10",
  // "SF11ec2d5657932065a8ab1db97b6e7b10",
  // "SF11ec2d5657932063a8ab1db97b6e7b10",
  // "SF11ec2d5657b32b89a8ab1db97b6e7b10",
  // "SF11ec2d5657b32b87a8ab1db97b6e7b10",
  // "SF11ec2d5657b32b8ba8ab1db97b6e7b10",
  // "SF11ec2d5657b4b220a8ab1db97b6e7b10",
  // "SF11ec2d5657b4b224a8ab1db97b6e7b10",
  // "SF11ec2d5657b4b227a8ab1db97b6e7b10",
  // "SF11ec2d5657c30a06a8ab1db97b6e7b10",
  // "SF11ec2d5657c30a0ca8ab1db97b6e7b10",
  // "SF11ec2d5657c30a0ea8ab1db97b6e7b10",
  // "SF11ec2d5657d13ad0a8ab1db97b6e7b10",
  // "SF11ec2d5657d13ad6a8ab1db97b6e7b10",
  // "SF11ec2d5657d13ad8a8ab1db97b6e7b10",
  // "SF11ec339fa48fd8f1a8ab1db97b6e7b10",
  // "SF11ec339fa48fd8f3a8ab1db97b6e7b10",
  // "SF11ec3b7af42272f09d378551e6df390e",
  // "SF11ec3b7af4229a009d378551e6df390e",
  // "SF11ec3c442ae2ebc09d378551e6df390e",
  // "SF11ec3c442ae2ebc29d378551e6df390e",
  // "SF11ec3c443c9e9030b92123d08468c4be",
  // "SF11ec3c445b3f98e0b92123d08468c4be",
  // "SF11ec3c4471fe59e0b92123d08468c4be",
  // "SF11ec3d0d9aface40b92123d08468c4be",
  // "SF11ec3d0da5640ef09d378551e6df390e",
  // "SF11ec40fc03e7ec73b92123d08468c4be",
  // "SF11ec40fc03e7ec74b92123d08468c4be",
  // "SF11ec41c4b1488c809786f5f328c188e5",
  1,
];

const run = async () => {
  const updatedFeeIds = [];

  const start = "2021-01-01 00:00:00";
  const end = "2021-06-01 00:00:00";
  const limit = 100;

  const rows = await new Promise((resolve, reject) => {
    db().query(
      `
      SELECT * FROM processor.settlement_fees 
      WHERE created_at BETWEEN ? AND ?
      AND source != "skynetsimulator"
      AND (transaction_id IS NULL OR transaction_id = "")
      AND type != "CUSTOM"
      AND id NOT IN (?)
      LIMIT ?
  `,
      [start, end, skipIds, limit],
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

  await Promise.all(
    rows.map(async (row) => {
      const transactions = await new Promise((resolve, reject) => {
        db().query(
          `
          SELECT * FROM processor.transactions 
          WHERE merchant_id = ?
          AND source = "finix"
          AND JSON_VALID(meta)
          AND meta->"$.externalId" = ?
          LIMIT 1
      `,
          [row.merchant_id, row.external_linked_id],
          (error, rows) => {
            if (error) {
              reject(error);
            } else {
              resolve(rows);
            }
          }
        );
      });

      const transaction = transactions[0];

      if (!transaction) {
        skipIds.push(row.id);
        return null;
      }

      console.log(row.id, "found matching transaction", transaction.id);

      try {
        await new Promise((resolve, reject) => {
          db().query(
            `
            UPDATE processor.settlement_fees
            SET transaction_id = ?
            WHERE id = ?
          `,
            [transaction.id, row.id],
            (error, result) => (error ? reject(error) : resolve(result))
          );
        });
        updatedFeeIds.push(row.id);
      } catch (error) {}
    })
  );

  console.log(
    "found fees:",
    rows.map((r) => r.id)
  );
  console.log("updated fees:", updatedFeeIds);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  run();

  // process.exit();
};

module.exports = { run };
