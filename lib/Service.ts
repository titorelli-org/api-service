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
import { env } from "./env";
import { oidcProvider } from "@titorelli-org/fastify-oidc-provider";
import {
  protectedRoutes,
  TokenValidator,
} from "@titorelli-org/fastify-protected-routes";
import { JwksStore } from "@titorelli-org/jwks-store";
import { validateToken } from "./misc/validateToken";

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
  jwksStore?: JwksStore;
  apiOrigin?: string;
  features?: {
    legacyAuth?: boolean;
    modernAuth?: boolean;
  };
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
  private apiOrigin = env.API_ORIGIN;
  private jwksStore?: JwksStore;
  private bots: BotsService;
  private features: ServiceConfig["features"] = {
    legacyAuth: true,
    modernAuth: false,
  };
  private ready: Promise<void>;

  constructor({
    port,
    host,
    logger,
    model,
    cas,
    jwtSecret,
    bots,
    features,
    oauthClients,
    apiOrigin,
  }: ServiceConfig) {
    this.logger = logger;
    this.cas = cas;
    this.model = model;
    this.port = port;
    this.host = host;
    this.jwtSecret = jwtSecret;
    this.bots = bots;
    this.oauthClients = oauthClients;
    this.features = Object.assign(
      {
        legacyAuth: true,
        modernAuth: false,
      },
      features,
    );
    if (apiOrigin != null) this.apiOrigin = apiOrigin;

    this.ready = this.initialize();

    this.logger.info(this.features, "Features list");
  }

  async listen() {
    await this.ready;

    await this.bots.start();

    await this.service.listen({ port: this.port, host: this.host });
  }

  public async terminate() {
    await this.bots.stop();

    await this.service.close();
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
    if (this.features.modernAuth) {
      if (this.jwksStore) {
        await this.service.register(oidcProvider, {
          origin: this.apiOrigin,
          jwksStore: this.jwksStore,
          logger: this.logger,
        });

        const tokenValidator = new TokenValidator({
          jwksStore: this.jwksStore,
          testSubject: (sub, url) => {
            this.logger.info({ sub, url }, "testSubject()");

            return true;
          },
          testAudience: (aud, url) => {
            this.logger.info({ aud, url }, "testAudience()");

            return true;
          },
          logger: this.logger,
        });

        await this.service.register(protectedRoutes, {
          origin: this.apiOrigin,
          authorizationServers: [`${this.apiOrigin}/oidc`],
          allRoutesRequireAuthorization: true,
          logger: this.logger,
          checkToken: async (token, url, scopes) => {
            this.logger.info({ token, url, scopes }, "checkToken()");

            if (await validateToken(token)) {
              return true;
            }

            return tokenValidator.validate(token, url, scopes);
          },
        });
      } else {
        this.logger.warn(
          "features.modernAuth are enabled, but jwksStore not provided",
        );
      }
    }

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

    if (this.features.legacyAuth) {
      await this.service.register(oauthPlugin, {
        oauthClients: this.oauthClients,
        bots: this.bots,
        logger: this.logger,
      });
    }
  }

  private async installCommonPluginsEnd() {
    await this.service.register(fastifySwaggerUi);
  }
}
