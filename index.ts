import path from "node:path";
import { readFileSync, existsSync } from "node:fs";
import yaml from "yaml";
import { Service } from "./lib/Service";
import { BotsService } from "./lib/bots/BotsService";
import { env } from "./lib/env";
import { RemoteAntispam, RemoteModel } from "./lib/model";
import { logger } from "./lib/logger";

const oauthClientsFilename = path.join(__dirname, "data/oauth-clients.yaml");

if (!existsSync(oauthClientsFilename)) {
  throw new Error("oauth-clients.yaml file must be present in a ./data folder");
}

new Service({
  port: env.PORT,
  host: env.HOST,
  logger,
  model: new RemoteModel(),
  cas: new RemoteAntispam(logger),
  jwtSecret: process.env.JWT_SECRET!,
  oauthClients: yaml.parse(readFileSync(oauthClientsFilename, "utf-8")),
  bots: new BotsService({
    dockhostToken: process.env.DOCKHOST_TOKEN!,
    baseDockhostProject: "titorelli-org",
    baseDockhostImage: "ghcr.io/titorelli-org/titus-bot",
    baseDockhostContainer: "titus-bot",
    logger,
  }),
  features: {
    legacyAuth: env.FEAT_LEGACY_AUTH,
    modernAuth: env.FEAT_MODERN_AUTH,
  },
}).listen();
