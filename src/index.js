const path = require("path");

try {
  require("dotenv").config({ path: path.resolve("./.env") });
} catch (e) {
  console.error("No .env file");
}

const queueChecker = require("./util/queue-checker")

queueChecker.startChecking();
