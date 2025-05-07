import fastifyPlugin from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { BotsPlugin } from "./BotsPlugin";
import type { Logger } from "pino";
import { BotsService } from "../../../bots";

export interface BotsPluginOpts {
  bots: BotsService;
  logger: Logger;
}

const botsPlugin: FastifyPluginAsync<BotsPluginOpts> = async (
  fastify,
  { bots, logger },
) => {
  const plugin = new BotsPlugin(fastify, bots, logger);

  await plugin.ready;
};

export default fastifyPlugin(botsPlugin);
