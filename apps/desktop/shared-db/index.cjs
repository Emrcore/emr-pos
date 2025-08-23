// shared-db/index.cjs  (CJS köprü)
const openDbMod    = require("./db.js");
const productsRepo = require("./repositories/productsRepo.js");
const salesRepo    = require("./repositories/salesRepo.js");
const settingsRaw  = require("./repositories/settingsRepo.js");
const reportsRepo  = require("./repositories/reportsRepo.js");

// ESM/CJS uyumu
const norm = (m) => (m && m.default) ? m.default : m;

const settingsRepo = norm(settingsRaw);
// get / set alias’ları (bazı sürümlerde getSetting/setSetting olabilir)
const getFn = settingsRepo.get || settingsRepo.getSetting;
const setFn = settingsRepo.set || settingsRepo.setSetting;
if (!getFn || !setFn) {
  throw new Error("settingsRepo içinde get/getSetting veya set/setSetting bulunamadı");
}

module.exports = {
  openDb: openDbMod.openDb || norm(openDbMod),
  productsRepo: norm(productsRepo),
  salesRepo: norm(salesRepo),
  settingsRepo: { ...settingsRepo, get: getFn, set: setFn },
  reports: norm(reportsRepo),
};
