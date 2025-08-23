// shared-db/index.js (ESM)
import { openDb } from "./db.js";
import * as productsRepo from "./repositories/productsRepo.js";
import * as salesRepo from "./repositories/salesRepo.js";
import * as settingsRepo from "./repositories/settingsRepo.js";
import * as reports from "./repositories/reportsRepo.js";

export { openDb, productsRepo, salesRepo, settingsRepo, reports };
export default { openDb, productsRepo, salesRepo, settingsRepo, reports };
