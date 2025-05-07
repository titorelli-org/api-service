import fastify, { type FastifyInstance } from "fastify";
import fastifyFormbody from "@fastify/formbody";
import fastifyJwt, { type FastifyJwtNamespace } from "@fastify/jwt";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import type { Logger } from "pino";
import type { IModel, ICas } from "./model";
import type { ServiceAuthClient } from "./types";
import type { BotsService } from "./bots";
import modelsPlugin from "./fastify/plugins/models";
import casPlugin from "./fastify/plugins/cas";
import botsPlugin from "./fastify/plugins/bots";
import oauthPlugin from "./fastify/plugins/oauth";

declare module "fastify" {
  interface FastifyInstance extends FastifyJwtNamespace<{ namespace: "jwt" }> {
    verifyToken: Function;
  }
}

export type ServiceConfig = {
  port: number;
  host: string;
  logger: Logger;
  cas: ICas;
  model: IModel;
  jwtSecret: string;
  bots: BotsService;
  oauthClients: ServiceAuthClient[];
};

export type JwtTokenPayload = {
  sub: string;
  scopes: string[];
};

export class Service {
  private logger: Logger;
  private cas: ICas;
  private model: IModel;
  private service: FastifyInstance;
  private port: number;
  private host: string;
  private jwtSecret: string;
  private oauthClients: ServiceAuthClient[];
  private bots: BotsService;
  private ready: Promise<void>;

  constructor({
    port,
    host,
    logger,
    model,
    cas,
    jwtSecret,
    bots,
    oauthClients,
  }: ServiceConfig) {
    this.logger = logger;
    this.cas = cas;
    this.model = model;
    this.port = port;
    this.host = host;
    this.jwtSecret = jwtSecret;
    this.bots = bots;
    this.oauthClients = oauthClients;
    this.ready = this.initialize();
  }

  async listen() {
    await this.ready;

    await this.bots.start();

    await this.service.listen({ port: this.port, host: this.host });
  }

  private async initialize() {
    this.service = fastify({ loggerInstance: this.logger, trustProxy: true });

    await this.installCommonPluginsBegin();
    await this.installAppPlugins();
    await this.installCommonPluginsEnd();
  }

  private async installCommonPluginsBegin() {
    await this.service.register(fastifyFormbody);
    await this.service.register(fastifyJwt, { secret: this.jwtSecret });
    await this.service.register(fastifySwagger, {
      openapi: {
        openapi: "3.0.0",
        info: {
          title: "Titorelli api client",
          description: "",
          version: "0.1.0",
        },
        servers: [
          {
            url: "http://localhost:3000",
            description: "Local dev server",
          },
          {
            url: "https://titorelli.ru",
            description: "Production server",
          },
        ],
      },
    });
  }

  private async installAppPlugins() {
    await this.service.register(modelsPlugin, {
      cas: this.cas,
      model: this.model,
      logger: this.logger,
    });

    await this.service.register(casPlugin, {
      cas: this.cas,
      logger: this.logger,
    });

    await this.service.register(botsPlugin, {
      bots: this.bots,
      logger: this.logger,
    });

    await this.service.register(oauthPlugin, {
      oauthClients: this.oauthClients,
      bots: this.bots,
      logger: this.logger,
    });
  }

  private async installCommonPluginsEnd() {
    await this.service.register(fastifySwaggerUi);
  }
}
