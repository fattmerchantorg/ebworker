"use strict";

// need to load env vars before the utility libs below
const path = require("path");

try {
  require("dotenv").config({ path: path.resolve("./.env") });
} catch (e) {
  console.error("No .env file");
}

const get = require("lodash/get");
const app = require("express")();
const cors = require("cors");
const bodyParser = require("body-parser");
const queueChecker = require("./util/queue-checker")

const port = process.env.PORT || 3008;

queueChecker.startChecking();

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get("/", (req, res, next) => {
  res.status(200).send("OK");
});

// ERROR HANDLERS
// development error handler
// will print stacktrace
app.use(function (err, req, res, next) {
  const isDev = ["development", "local"].indexOf(app.get("env")) > -1;

  const responseJson = Object.assign({}, err, {
    status: get(err, "status", 500),
    message: get(err, "message", "Generic Error"),
    // unless an error specifically includes a stack, only actual exceptions would have a stack
    stack: isDev && err.stack ? err.stack : undefined
  });

  console.log("Handling Error from Route");
  console.error(err);
  res.status(responseJson.status).json(responseJson);
});

const server = app.listen(port, function () {
  let port = server.address().port;
  let addr = server.address().address;
  server.setTimeout(5*60*1000);

  console.log("Proxy Gateway listening on http://%s:%s", addr, port);
});

// for testing
module.exports = server;
