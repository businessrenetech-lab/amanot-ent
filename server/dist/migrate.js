import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);

// server/src/migrate.ts
import "dotenv/config";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import mysql2 from "mysql2/promise";

// server/src/db.ts
import "dotenv/config";
import mysql from "mysql2/promise";
function dbConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || process.env.DB_USERNAME || "root",
    password: process.env.DB_PASSWORD ?? process.env.DB_PASS ?? "",
    database: process.env.DB_NAME || process.env.DB_DATABASE || "amanat_platform",
    charset: "utf8mb4",
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
    // JSON columns come back already parsed; keep decimals as JS numbers.
    decimalNumbers: true
  };
}

// server/src/migrate.ts
var __dirname = dirname(fileURLToPath(import.meta.url));
var SCHEMA_PATH = resolve(__dirname, "..", "schema.sql");
async function migrate() {
  const cfg = dbConfig();
  const schemaSql = readFileSync(SCHEMA_PATH, "utf8");
  const bootstrap = await mysql2.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    multipleStatements: true
  });
  try {
    await bootstrap.query(
      `CREATE DATABASE IF NOT EXISTS \`${cfg.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`\u2713 Database "${cfg.database}" ready.`);
  } catch (err) {
    console.warn(
      `! Could not create database "${cfg.database}" (${err.code || err.message}). Assuming it already exists.`
    );
  } finally {
    await bootstrap.end();
  }
  const conn = await mysql2.createConnection({
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    multipleStatements: true
  });
  try {
    await conn.query(schemaSql);
    console.log("\u2713 Schema applied \u2014 all tables are in place.");
  } finally {
    await conn.end();
  }
}
migrate().then(() => {
  console.log("Migration complete.");
  process.exit(0);
}).catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
