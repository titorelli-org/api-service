import { readFileSync } from "node:fs";
import { Logger } from "pino";
import yaml from "yaml";
import { Service } from "./Service";
import { BotsService } from "./bots/BotsService";
import { env } from "./env";
import { RemoteAntispam, RemoteModel } from "./model";
import { logger as commonLogger } from "./logger";
import { JwksStore } from "@titorelli-org/jwks-store";

export const createService = ({
  oauthClientsFilename,
  legacyAuth,
  modernAuth,
  jwksFilename,
  apiOrigin,
  logger,
}: {
  oauthClientsFilename: string;
  legacyAuth: boolean;
  modernAuth: boolean;
  jwksFilename?: string;
  apiOrigin?: string;
  logger?: Logger;
}) => {
  return new Service({
    port: env.PORT,
    host: env.HOST,
    logger: logger ?? commonLogger,
    model: new RemoteModel(),
    cas: new RemoteAntispam(logger),
    jwtSecret: process.env.JWT_SECRET!,
    oauthClients: yaml.parse(readFileSync(oauthClientsFilename, "utf-8")),
    jwksStore: jwksFilename ? new JwksStore(jwksFilename) : undefined,
    bots: new BotsService({
      dockhostToken: process.env.DOCKHOST_TOKEN!,
      baseDockhostProject: "titorelli-org",
      baseDockhostImage: "ghcr.io/titorelli-org/titus-bot",
      baseDockhostContainer: "titus-bot",
      logger,
    }),
    apiOrigin,
    features: {
      legacyAuth,
      modernAuth,
    },
  });
};
