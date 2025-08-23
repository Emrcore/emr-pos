// apps/desktop/shared-db/index.cjs
const openDb = require("./db.js");
const productsRepo = require("./repositories/productsRepo.js");
const salesRepo = require("./repositories/salesRepo.js");
const settingsRepo = require("./repositories/settingsRepo.js");
const reports = require("./repositories/reportsRepo.js");

module.exports = {
  openDb: openDb.openDb || openDb,
  productsRepo,
  salesRepo,
  settingsRepo,
  reports
};
