const path = require("path");

try {
  require("dotenv").config({ path: path.resolve("./.env") });
} catch (e) {
  console.error("No .env file");
}

// const queueChecker = require("./queue-checker");

// queueChecker.startChecking();

const settlement = require("./settlement-finder");
// settlement.writeCsv();
