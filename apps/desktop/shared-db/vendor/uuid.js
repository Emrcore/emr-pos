import { randomUUID } from "node:crypto";
export function v4() { return randomUUID(); }
export default { v4 };
