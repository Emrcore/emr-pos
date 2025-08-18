import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pkg;

export const db = new Pool({
  host: "localhost",
  port: 5432,
  user: "postgres",
  password: "Emirhan.38", // ? burasý önemli
  database: "emr_pos",
});
