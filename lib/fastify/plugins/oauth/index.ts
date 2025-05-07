import fastifyPlugin from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { OauthPlugin } from "./OauthPlugin";
import type { Logger } from "pino";
import { BotsService } from "../../../bots";

export interface OauthPluginOpts {
  bots: BotsService;
  oauthClients: ReadonlyArray<{
    id: string;
    secret: string;
    scopes: string[];
  }>;
  logger: Logger;
}

const oauthPlugin: FastifyPluginAsync<OauthPluginOpts> = async (
  fastify,
  { oauthClients, logger, bots },
) => {
  const plugin = new OauthPlugin(fastify, oauthClients, bots, logger);

  await plugin.ready;
};

export default fastifyPlugin(oauthPlugin);
