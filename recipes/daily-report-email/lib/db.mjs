import postgres from "postgres";
let sql = null;
export const db = () => (sql ??= postgres(process.env.DATABASE_URL, { max: 1, ssl: "require" }));
