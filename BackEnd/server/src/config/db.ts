import pkg from "pg";
import { env } from "./enviroment";

const { Pool } = pkg;

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
});

pool.on("connect", () => {
  console.log("PostgreSQL pool connected");
});

pool.on("error", (err: Error) => {
  console.error("PostgreSQL pool error", err);
});

export default pool;

export const connectDB = async (retries = 5, delayMs = 3000): Promise<void> => {
  let lastError: any;

  for (let i = 0; i < retries; i += 1) {
    try {
      const client = await pool.connect();
      client.release();
      console.log("Connected to PostgreSQL (Neon) successfully!");
      return;
    } catch (err) {
      lastError = err;
      console.warn(`PostgreSQL connection attempt ${i + 1}/${retries} failed. Retrying in ${delayMs}ms...`, err);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.error("All PostgreSQL connection attempts failed", lastError);
  throw lastError;
};

export const closeDB = async (): Promise<void> => {
  await pool.end();
};