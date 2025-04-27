import { cleanEnv, host, port, str, url } from "envalid";

export const env = cleanEnv(process.env, {
  PORT: port({ default: 3000 }),
  HOST: host({ default: "0.0.0.0" }),
  SITE_ORIGIN: url(),
  YANDEX_FUNCTION_URL: url(),
  JWT_SECRET: str(),
  TELEMETRY_DB_FILENAME: str({ default: "data/telemetry.sqlite" }),
  MARKUP_DB_FILENAME: str({ default: "data/markup.sqlite" }),
  DOCKHOST_TOKEN: str(),
  CAS_ORIGIN: url(),
  API_ORIGIN: url(),
  MODEL_ORIGIN: url(),
  TEXT_ORIGIN: url(),
});
