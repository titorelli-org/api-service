import fastifyPlugin from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { CasPlugin } from "./CasPlugin";
import type { ICas, IModel } from "../../../model";
import type { Logger } from "pino";

export interface CasPlugonOpts {
  cas: ICas;
  logger: Logger;
}

const casPlugin: FastifyPluginAsync<CasPlugonOpts> = async (
  fastify,
  { cas, logger },
) => {
  const plugin = new CasPlugin(fastify, cas, logger);

  await plugin.ready;
};

export default fastifyPlugin(casPlugin);
