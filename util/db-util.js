"use strict";

const mysql = require("mysql");

// START MYSQL VERSION
/** @type {import('mysql').Pool} */
let _pool;

function mysqlConnect() {
  const debug = (process.env.APP_DEBUG || "").toString() === "true";

  const pool = mysql.createPool({
    connectionLimit: process.env.DB_POOL_SIZE || 2,
    debug: debug ? ["ComQueryPacket", "RowDataPacket"] : undefined,
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: module.exports.DB_DATABASE,
    port: process.env.DB_PORT,
    ssl: process.env.DB_RDS === "true" ? "Amazon RDS" : null,
    // ...
    dateStrings: ["DATE", "DATETIME"],
    timezone: "UTC",
  });

  pool.on("connection", (conn) => {
    conn.query("SET time_zone='+00:00';", (error) => {
      if (error) {
        throw error;
      }
    });
  });

  if (process.env.NODE_ENV !== "test") {
    // initial connection check
    pool.getConnection(function (error, connection) {
      if (error) {
        console.error("mysql connection error", error.stack);
        return false;
      }

      connection.release();
    });
  }

  _pool = pool;
}

mysqlConnect();

function db() {
  /** @typedef {import('mysql').Pool} */
  return _pool;
}

module.exports = { db };
