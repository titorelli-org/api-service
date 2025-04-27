import { createHash } from "node:crypto";
import fastify, { type FastifyInstance } from "fastify";
import type { Logger } from "pino";
import fastifyFormbody from "@fastify/formbody";
import fastifyJwt, { type FastifyJwtNamespace } from "@fastify/jwt";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import type { LabeledExample, Prediction, IModel, ICas } from "./model";
import type { ServiceAuthClient } from "./types";
import { BotsService } from "./bots";
import { env } from "./env";

export type OauthTokenResult = {
  access_token: string;
  token_type: "Bearer";
  scope: string;
};

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
  private modelPredictPath = "/models/:modelId/predict";
  private modelTrainPath = "/models/:modelId/train";
  private modelTrainBulkPath = "/models/:modelId/train_bulk";
  private modelExactMatchTrainPath = "/models/:modelId/exact_match/train";
  private modelTotemsTrainPath = "/models/:modelId/totems/train";
  private casPredictPath = "/cas/predict";
  private casTrainPath = "/cas/train";
  private botsCreatePath = "/bots";
  private botsListPath = "/bots";
  private botsUpdatePath = "/bots/:botExtrnalId";
  private botsStatePath = "/bots/:botExtrnalId/state";
  private botsRemovePath = "/bots/:botExtrnalId";
  private botsLivenessPath = "/bots/liveness";
  private ouathTokenPath = "/oauth2/token";

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

    await this.installPluginsBegin();

    await this.installModelPredictRoute();
    await this.installModelTrainRoute();
    await this.installModelTrainBulkRoute();
    await this.installModelExactMatchTrainRoute();
    await this.installModelTotemsTrainRoute();

    await this.installCasPredictRoute();
    await this.installCasTrainRoute();

    await this.installBotsCreateRoute();
    await this.installBotsListRoute();
    await this.installBotsUpdateRoute();
    await this.installBotsRemoveRoute();
    await this.installBotsStateRoute();
    await this.installBotsLivenessRoute();
    await this.installBotDropdbRoute();

    await this.installOauthTokenRoute();

    await this.installPluginsEnd();
  }

  private verifyToken = (req, reply, done) => {
    const token = this.service.jwt.lookupToken(req);

    try {
      this.service.jwt.verify(token);

      done();
    } catch (error) {
      this.logger.error(error);

      reply.send(error);
    }
  };

  private allowScopeTemplate = (scopePostfix: string) => {
    return (req, _reply, done) => {
      const {
        params: { modelId },
      } = req;
      const { sub, scopes } = this.service.jwt.decode<JwtTokenPayload>(
        this.service.jwt.lookupToken(req),
      );

      const finalScope = `${modelId}/${scopePostfix}`;

      if (!scopes.includes(finalScope))
        throw new Error(
          `Client with id = '${sub}' don't have scope ${finalScope} for this operation`,
        );

      done();
    };
  };

  private allowScopeExact = (testScope: string) => {
    return (req, _reply, done) => {
      const { sub, scopes } = this.service.jwt.decode<JwtTokenPayload>(
        this.service.jwt.lookupToken(req),
      );

      if (!scopes.includes(testScope))
        throw new Error(
          `Client with id = ${sub} don't have scope ${testScope} for this operatiob`,
        );

      done();
    };
  };

  private async installPluginsBegin() {
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

  private async installModelPredictRoute() {
    await this.service.post<{
      Body: {
        text: string;
        tgUserId?: number;
      };
      Params: {
        modelId: string;
      };
    }>(
      this.modelPredictPath,
      {
        onRequest: [this.verifyToken, this.allowScopeTemplate("predict")],
        schema: {
          body: {
            type: "object",
            required: ["text"],
            properties: {
              text: { type: "string" },
              tgUserId: { type: "number" },
            },
          },
          response: {
            200: {
              type: "object",
              properties: {
                reason: { enum: ["classifier", "duplicate", "totem", "cas"] },
                label: { enum: ["spam", "ham"] },
                confidence: { type: "number" },
              },
            },
          },
        },
      },
      async (req) => {
        await this.ready;

        const {
          params: { modelId: _modelId },
          body: { text, tgUserId },
        } = req;

        this.logger.info({ text, tgUserId }, "model/:modelId/prediction");

        if (tgUserId != null) {
          this.logger.info(243);

          const casPrediction = await this.checkCas(tgUserId);

          this.logger.info(247, "casPrediction:", casPrediction);

          if (casPrediction != null) {
            console.log(250);

            return casPrediction;
          }
        }

        const result = await this.model.predict({ text });

        return result;
      },
    );
  }

  private async checkCas(tgUserId: number): Promise<Prediction | null> {
    if (await this.cas.has(tgUserId)) {
      return {
        label: "spam",
        confidence: 1,
        reason: "cas",
      };
    }

    return null;
  }

  private async installModelTrainRoute() {
    await this.service.post<{
      Body: {
        label: "spam" | "ham";
        text: string;
      };
      Params: {
        modelId: string;
      };
    }>(
      this.modelTrainPath,
      {
        onRequest: [this.verifyToken, this.allowScopeTemplate("train")],
        schema: {
          body: {
            type: "object",
            required: ["text"],
            properties: {
              label: {
                enum: ["spam", "ham"],
              },
              text: {
                type: "string",
              },
            },
          },
        },
      },
      async ({ params: { modelId: _modelId }, body: { text, label } }) => {
        await this.ready;

        await this.model.train({ text, label });
      },
    );
  }

  private async installModelTrainBulkRoute() {
    await this.service.post<{
      Body: {
        label: "spam" | "ham";
        text: string;
      }[];
      Params: {
        modelId: string;
      };
    }>(
      this.modelTrainBulkPath,
      {
        onRequest: [this.verifyToken, this.allowScopeTemplate("train_bulk")],
        schema: {
          body: {
            type: "array",
            items: {
              type: "object",
              required: ["text", "label"],
              properties: {
                label: {
                  enum: ["spam", "ham"],
                },
                text: {
                  type: "string",
                },
              },
            },
          },
        },
      },
      async (req) => {
        await this.ready;

        const {
          params: { modelId: _modelId },
          body: examples,
        } = req;

        await this.model.trainBulk(examples);
      },
    );
  }

  private async installModelExactMatchTrainRoute() {
    await this.service.post<{
      Body: LabeledExample;
      Params: {
        modelId: string;
      };
    }>(
      this.modelExactMatchTrainPath,
      {
        onRequest: [
          this.verifyToken,
          this.allowScopeTemplate("exact_match/train"),
        ],
        schema: {
          params: {
            type: "object",
            properties: {
              modelId: { type: "string" },
            },
          },
          body: {
            type: "object",
            properties: {
              text: { type: "string" },
              label: { enum: ["spam", "ham"] },
            },
          },
        },
      },
      async ({ params: { modelId: _modelId }, body: { text, label } }) => {
        await this.ready;

        try {
          const textUrl = new URL("/text", env.TEXT_ORIGIN);

          const resp = await fetch(textUrl, {
            method: "PUT",
            body: text,
            headers: {
              "Content-Type": "text/plain",
            },
          });

          const textUuid = await resp.text();

          const metadataUrl = new URL(`/metadata/${textUuid}`, env.TEXT_ORIGIN);

          await fetch(metadataUrl, {
            method: "PUT",
            body: JSON.stringify({ label, confidence: 1 }),
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (e) {
          this.logger.error(e);
        }
      },
    );
  }

  private async installModelTotemsTrainRoute() {
    await this.service.post<{
      Params: {
        modelId: string;
      };
      Body: {
        tgUserId: number;
      };
    }>(
      this.modelTotemsTrainPath,
      {
        onRequest: [this.verifyToken, this.allowScopeTemplate("totems/train")],
        schema: {
          params: {
            type: "object",
            properties: {
              modelId: { type: "string" },
            },
          },
          body: {
            type: "object",
            properties: {
              tgUserId: { type: "number" },
            },
          },
        },
      },
      async ({ params: { modelId: _modelId }, body: { tgUserId } }) => {
        await this.ready;

        await this.cas.remove(tgUserId);
      },
    );
  }

  private async installCasPredictRoute() {
    await this.service.post<{
      Body: {
        tgUserId: number;
      };
    }>(
      this.casPredictPath,
      {
        onRequest: [this.verifyToken, this.allowScopeExact("cas/predict")],
        schema: {
          body: {
            type: "object",
            required: ["tgUserId"],
            properties: {
              tgUserId: { type: "number" },
            },
          },
          response: {
            200: {
              type: "object",
              properties: {
                banned: { type: "boolean" },
              },
            },
          },
        },
      },
      async ({ body: { tgUserId } }) => {
        await this.ready;

        const banned = await this.cas.has(tgUserId);

        return { banned };
      },
    );
  }

  private async installCasTrainRoute() {
    await this.service.post<{
      Body: {
        tgUserId: number;
      };
    }>(
      this.casTrainPath,
      {
        onRequest: [this.verifyToken, this.allowScopeExact("cas/train")],
        schema: {
          body: {
            type: "object",
            properties: {
              tgUserId: { type: "number" },
            },
          },
        },
      },
      async ({ body: { tgUserId } }) => {
        await this.ready;

        await this.cas.add(tgUserId);
      },
    );
  }

  private async installBotsCreateRoute() {
    await this.service.post<{
      Body: {
        id: number;
        accessToken: string;
        bypassTelemetry: boolean;
        accountId: number;
        modelId: number;
        tgBotToken: string;
        scopes: string;
      };
    }>(
      this.botsCreatePath,
      {
        schema: {
          body: {
            type: "object",
            properties: {
              id: { type: "number" },
              accessToken: { type: "string" },
              bypassTelemetry: { type: "boolean" },
              accountId: { type: "number" },
              modelId: { type: "number" },
              tgBotToken: { type: "string" },
              scopes: { type: "string" },
            },
          },
        },
      },
      async ({ body }) => {
        await this.ready;

        await this.bots.create(body);
      },
    );
  }

  private async installBotsListRoute() {
    await this.service.get<{
      Querystring: {
        accountId: number;
      };
    }>(
      this.botsListPath,
      {
        schema: {
          querystring: {
            type: "object",
            properties: {
              accountId: { type: "number" },
            },
          },
        },
      },
      async ({ query: { accountId } }) => {
        return this.bots.list(accountId);
      },
    );
  }

  private async installBotsUpdateRoute() {
    await this.service.post<{
      Params: {
        botExtrnalId: number;
      };
      Body: {
        bypassTelemetry?: boolean;
        modelId?: number;
        tgBotToken?: string;
        state?: "starting" | "stopping";
      };
    }>(
      this.botsUpdatePath,
      {
        schema: {
          params: {
            type: "object",
            properties: {
              botExtrnalId: { type: "number" },
            },
          },
          body: {
            type: "object",
            properties: {
              bypassTelemetry: { type: "boolean" },
              modelId: { type: "number" },
              tgBotToken: { type: "string" },
              state: { enum: ["starting", "stopping", "deleted"] },
            },
          },
        },
      },
      async ({ body, params: { botExtrnalId } }) => {
        await this.ready;

        await this.bots.update({ ...body, id: botExtrnalId });
      },
    );
  }

  private async installBotsRemoveRoute() {
    await this.service.delete<{
      Params: {
        botExtrnalId: number;
      };
    }>(
      this.botsRemovePath,
      {
        schema: {
          params: {
            type: "object",
            properties: {
              botExtrnalId: { type: "number" },
            },
          },
        },
      },
      async ({ params: { botExtrnalId } }) => {
        await this.bots.remove(botExtrnalId);
      },
    );
  }

  private async installBotsStateRoute() {
    await this.service.get<{
      Params: {
        botExtrnalId: number;
      };
    }>(
      this.botsStatePath,
      {
        schema: {
          params: {
            type: "object",
            properties: {
              botExtrnalId: { type: "number" },
            },
          },
        },
      },
      async ({ params: { botExtrnalId } }) => {
        await this.ready;

        const data = await this.bots.get(botExtrnalId);

        return data?.state ?? null;
      },
    );
  }

  private async installBotsLivenessRoute() {
    await this.service.post<{
      Querystring: {
        clientId: string;
      };
    }>(
      this.botsLivenessPath,
      {
        schema: {
          querystring: {
            type: "object",
            properties: {
              clientId: { type: "string" },
            },
          },
        },
      },
      async ({ query: { clientId } }) => {
        await this.ready;

        return this.bots.reportAlive(clientId);
      },
    );
  }

  private async installBotDropdbRoute() {
    let hash = createHash("SHA-256")
      .update(process.env.JWT_SECRET)
      .update("--pepper--")
      .digest("hex");

    this.logger.info("DROPDB TOKEN: %s", btoa(hash));

    const path = `/bots/dropdb/${hash}`;

    await this.service.post(
      path,
      {
        schema: {
          tags: ["X-HIDDEN"],
        },
      },
      async () => {
        await this.bots.dropdb();
      },
    );
  }

  private async installOauthTokenRoute() {
    await this.service.post<{
      Body: {
        grant_type: "client_credentials";
        client_id: string;
        client_secret: string;
        scope: string;
      };
    }>(
      this.ouathTokenPath,
      {
        schema: {
          body: {
            type: "object",
            properties: {
              grant_type: { enum: ["client_credentials"] },
              client_id: { type: "string" },
              client_secret: { type: "string" },
              scope: { type: "string" },
            },
          },
          response: {
            200: {
              type: "object",
              properties: {
                access_token: { type: "string" },
                token_type: { enum: ["Bearer"] },
                expires_id: { type: "number" },
                scope: { type: "string" },
              },
            },
          },
        },
      },
      async ({ body }) => {
        await this.ready;

        let result: OauthTokenResult | null = null;

        try {
          result = await this.legacyTokenHandler(
            body.client_id,
            body.client_secret,
            body.scope,
          );

          return result;
        } catch (e) {
          this.logger.info(
            "Client with id = %s attempted to get token with legacy path, errored: %j",
            body.client_id,
            e,
          );
        }

        return this.modernTokenHandler(
          body.client_id,
          body.client_secret,
          body.scope,
        );
      },
    );
  }

  private async legacyTokenHandler(
    clientId: string,
    clientSecret: string,
    scope: string,
  ) {
    const client = this.oauthClients.find(({ id }) => id === clientId);

    if (!client) {
      throw new Error(
        `Client with id = "${clientId}" not registered within system`,
      );
    }

    if (client.secret !== clientSecret)
      throw new Error("Client credentials not valid");

    const requestScopes =
      scope
        ?.split(" ")
        .map((s) => s.trim())
        .filter((s) => s) ?? [];

    const scopes = requestScopes.filter((s) => client.scopes.includes(s));

    const token = this.service.jwt.sign({
      sub: clientId,
      scopes: scopes,
    });

    return {
      access_token: token,
      token_type: "Bearer",
      expires_id: -1,
      scope: scopes.join(" "),
    } as OauthTokenResult;
  }

  private async modernTokenHandler(
    clientId: string,
    clientSecret: string,
    scope: string,
  ) {
    const requestScopes =
      scope
        ?.split(" ")
        .map((s) => s.trim())
        .filter((s) => s) ?? [];

    const [hasAccess, grantedScopes] = await this.bots.assertIdentity(
      clientId,
      clientSecret,
      requestScopes,
    );

    if (hasAccess) {
      const token = this.service.jwt.sign({
        sub: clientId,
        scopes: scope,
      });

      return {
        access_token: token,
        token_type: "Bearer",
        scope: grantedScopes.join(" "),
      } as OauthTokenResult;
    }

    return null;
  }

  private async installPluginsEnd() {
    await this.service.register(fastifySwaggerUi);
  }
}
