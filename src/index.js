const path = require("path");

try {
  require("dotenv").config({ path: path.resolve("./.env") });
} catch (e) {
  console.error("No .env file");
}

// require("./queue-checker").startChecking();
// const settlement = require("./settlement-finder").writeCsv();
// require("./processed-settlement-updater").run();
// require("./fee-transaction_id-updater").run();
// require("./pmid-finder").run();
// require("./fee-profile-updater").run();
require("./mcc-thing").writeCsv();
