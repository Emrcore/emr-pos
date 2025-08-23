// apps/desktop/shared-db/index.mjs (ESM)
import * as openDbMod from "./db.js";
import * as productsRepo from "./repositories/productsRepo.js";
import * as salesRepo from "./repositories/salesRepo.js";
import * as settingsRepo from "./repositories/settingsRepo.js";
import * as reports from "./repositories/reportsRepo.js";

export const openDb =
  openDbMod.openDb ?? openDbMod.default ?? openDbMod;

export { productsRepo, salesRepo, settingsRepo, reports };

export default {
  openDb,
  productsRepo,
  salesRepo,
  settingsRepo,
  reports
};
