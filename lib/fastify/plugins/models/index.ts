import fastifyPlugin from "fastify-plugin";
import type { FastifyPluginAsync } from "fastify";
import { ModelsPlugin } from "./ModelsPlugin";
import type { ICas, IModel } from "../../../model";
import type { Logger } from "pino";

export interface ModelsPluginOpts {
  model: IModel;
  cas: ICas;
  logger: Logger;
}

const modelsPlugin: FastifyPluginAsync<ModelsPluginOpts> = async (
  fastify,
  { model, cas, logger },
) => {
  const plugin = new ModelsPlugin(fastify, model, cas, logger);

  await plugin.ready;
};

export default fastifyPlugin(modelsPlugin);
