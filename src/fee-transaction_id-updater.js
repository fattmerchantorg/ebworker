const { db } = require("../util/db-util");

const run = async () => {
  const updatedFeeIds = [];

  const start = "2021-05-01 00:00:00";
  const end = "2021-12-01 00:00:00";
  const limit = 200;

  const rows = await new Promise((resolve, reject) => {
    db().query(
      `
      SELECT * FROM processor.settlement_fees 
      WHERE created_at BETWEEN ? AND ?
      AND transaction_id = ""
      OR transaction_id IS null
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

  await Promise.all(
    rows.map(async (row) => {
      const transactions = await new Promise((resolve, reject) => {
        db().query(
          `
          SELECT * FROM processor.transactions 
          WHERE merchant_id = ?
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

      if (!transaction) return null;

      console.log(row.id, "found matching transaction", transaction.id);

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
    })
  );

  console.log("updated fees:", updatedFeeIds);
  process.exit();
};

module.exports = { run };
