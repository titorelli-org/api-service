import fastify, { type FastifyInstance } from "fastify";
import fastifyFormbody from "@fastify/formbody";
import fastifyJwt, { type FastifyJwtNamespace } from "@fastify/jwt";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import type { Logger } from "pino";
import type {
  EnsembleModel,
  LabeledExample,
  Prediction,
  TemporaryStorage,
  IModel,
  ITotems,
  ICas,
} from "./model";
import type { ServiceAuthClient } from "./types";
import { TelemetryServer } from "./telemetry/TelemetryServer";
import type {
  ChatInfo,
  MessageInfo,
  SelfInfo,
  UserInfo,
} from "./telemetry/types";
import { MarkupServer } from "./markup/MarkupServer";
import { BotsService } from "./bots";

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
  modelsStore: TemporaryStorage<IModel, [string]>;
  cas: ICas;
  totemsStore: TemporaryStorage<ITotems, [string]>;
  jwtSecret: string;
  telemetry: TelemetryServer;
  markup: MarkupServer;
  bots: BotsService;
  oauthClients: ServiceAuthClient[];
};

export type JwtTokenPayload = {
  sub: string;
  scopes: string[];
};

export class Service {
  private logger: Logger;
  private modelsStore: TemporaryStorage<IModel, [string]>;
  private cas: ICas;
  private totemsStore: TemporaryStorage<ITotems, [string]>;
  private service: FastifyInstance;
  private port: number;
  private host: string;
  private jwtSecret: string;
  private oauthClients: ServiceAuthClient[];
  private telemetry: TelemetryServer;
  private markup: MarkupServer;
  private bots: BotsService;
  private ready: Promise<void>;
  private modelPredictPath = "/models/:modelId/predict";
  private modelTrainPath = "/models/:modelId/train";
  private modelTrainBulkPath = "/models/:modelId/train_bulk";
  private modelExactMatchTrainPath = "/models/:modelId/exact_match/train";
  private modelTotemsTrainPath = "/models/:modelId/totems/train";
  private telemetryTrackBotInfoPath = "/telemetry/track_bot";
  private telemetryTrackMemberInfoPath = "/telemetry/track_member";
  private telemetryTrackChatInfoPath = "/telemetry/track_chat";
  private telemetryTrackMessagePath = "/telemetry/track_message";
  private telemetryTrackPredictionPath = "/telemetry/track_prediction";
  private markupChatsPath = "/markup/chats";
  private markupExamplesPath = "/markup/examples";
  private markupLabelsPath = "/markup/labels";
  private markupMemberPath = "/markup/members/:memberId";
  private casPredictPath = "/cas/predict";
  private casTrainPath = "/cas/train";
  private botsCreatePath = "/bots";
  private botsListPath = "/bots";
  private botsUpdatePath = "/bots/:externalBotId";
  private botsStatePath = "/bots/:externalBotId/state";
  private botsRemovePath = "/bots/:externalBotId";
  private botsConvergePath = "/bots/converge"; // TODO: Remove
  private botsLivenessPath = "/bots/liveness";
  private ouathTokenPath = "/oauth2/token";

  constructor({
    port,
    host,
    logger,
    modelsStore,
    cas,
    totemsStore,
    jwtSecret,
    telemetry,
    markup,
    bots,
    oauthClients,
  }: ServiceConfig) {
    this.logger = logger;
    this.modelsStore = modelsStore;
    this.cas = cas;
    this.totemsStore = totemsStore;
    this.port = port;
    this.host = host;
    this.jwtSecret = jwtSecret;
    this.telemetry = telemetry;
    this.markup = markup;
    this.bots = bots;
    this.oauthClients = oauthClients;
    this.ready = this.initialize();
  }

  async listen() {
    await this.ready;

    await this.service.listen({ port: this.port, host: this.host });
  }

  private async initialize() {
    this.service = fastify({ loggerInstance: this.logger });

    await this.installPluginsBegin();

    await this.installModelPredictRoute();
    await this.installModelTrainRoute();
    await this.installModelTrainBulkRoute();
    await this.installModelExactMatchTrainRoute();
    await this.installModelTotemsTrainRoute();

    await this.installCasPredictRoute();
    await this.installCasTrainRoute();

    await this.installTelemetryTrackBotInfo();
    await this.installTelemetryTrackMemberInfo();
    await this.installTelemetryTrackChatInfo();
    await this.installTelemetryTrackMessage();
    await this.installTelemetryTrackPrediction();

    await this.installMarkupChats();
    await this.installMarkupExamples();
    await this.installMarkupLabels();
    await this.installMarkupMembers();

    await this.installBotsCreateRoute();
    await this.installBotsListRoute();
    await this.installBotsUpdateRoute();
    await this.installBotsRemoveRoute();
    await this.installBotsStateRoute();
    await this.installBotsConvergeRoute();
    await this.installBotsLivenessRoute();

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
                value: { enum: ["spam", "ham"] },
                confidence: { type: "number" },
              },
            },
          },
        },
      },
      async (req) => {
        await this.ready;

        const {
          params: { modelId },
          body: { text, tgUserId },
        } = req;

        if (tgUserId != null) {
          {
            const casPrediction = await this.checkCas(tgUserId);

            if (casPrediction != null) return casPrediction;
          }

          {
            const totemPrediction = await this.checkTotem(modelId, tgUserId);

            if (totemPrediction != null) return totemPrediction;
          }
        }

        const model = await this.modelsStore.getOrCreate(modelId);

        return model.predict({ text });
      },
    );
  }

  private async checkCas(tgUserId: number): Promise<Prediction | null> {
    if (await this.cas.has(tgUserId)) {
      return {
        value: "spam",
        confidence: 1,
        reason: "cas",
      };
    }

    return null;
  }

  private async checkTotem(
    modelId: string,
    tgUserId: number,
  ): Promise<Prediction | null> {
    const totems = await this.totemsStore.getOrCreate(modelId);

    if (await totems.has(tgUserId)) {
      return {
        value: "ham",
        confidence: 1,
        reason: "totem",
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
      async ({ params: { modelId }, body: { text, label } }) => {
        await this.ready;

        const model = await this.modelsStore.getOrCreate(modelId);

        await model.train({ text, label });
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
          params: { modelId },
          body: examples,
        } = req;

        const model = await this.modelsStore.getOrCreate(modelId);

        await model.trainBulk(examples);
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
      async ({ params: { modelId }, body }) => {
        await this.ready;

        const ensemble = (await this.modelsStore.getOrCreate(
          modelId,
        )) as Awaited<EnsembleModel>;
        const emModel = ensemble.getModelByType("exact-match");

        if (!emModel) return null;

        await emModel.train(body);
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
      async ({ params: { modelId }, body: { tgUserId } }) => {
        await this.ready;

        const totems = await this.totemsStore.getOrCreate(modelId);

        await totems.add(tgUserId);
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

  private async installTelemetryTrackBotInfo() {
    await this.service.post<{
      Body: SelfInfo;
    }>(
      this.telemetryTrackBotInfoPath,
      {
        // onRequest: [this.verifyToken],
        schema: {
          body: {
            type: "object",
            properties: {
              id: { type: "number" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              username: { type: "string" },
              languageCode: { type: "string" },
              isPremium: { type: "boolean" },
              addedToAttachmentMenu: { type: "boolean" },
              isBot: { type: "boolean" },
              canJoinGroups: { type: "boolean" },
              canReadAllGroupMessages: { type: "boolean" },
              supportsInlineQueries: { type: "boolean" },
            },
          },
        },
      },
      async ({ body }) => {
        await this.ready;

        await this.telemetry.trackSelfBotInfo(body);
      },
    );
  }

  private async installTelemetryTrackMemberInfo() {
    await this.service.post<{ Body: UserInfo }>(
      this.telemetryTrackMemberInfoPath,
      {
        /*onRequest: [this.verifyToken],*/ schema: {
          body: {
            type: "object",
            properties: {
              id: { type: "number" },
              isBot: { type: "boolean" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              username: { type: "string" },
              languageCode: { type: "string" },
              isPremium: { type: "boolean" },
              addedToAttachmentMenu: { type: "boolean" },
              reporterTgBotId: { type: "number" },
            },
          },
        },
      },
      async ({ body }) => {
        await this.ready;

        await this.markup.insertMember({
          tgUserId: body.id,
          languageCode: body.languageCode,
          isPremium: body.isPremium,
        });

        await this.telemetry.trackMemberInfo(body);
      },
    );
  }

  private async installTelemetryTrackChatInfo() {
    await this.service.post<{ Body: ChatInfo }>(
      this.telemetryTrackChatInfoPath,
      {
        // onRequest: [this.verifyToken],
        schema: {
          body: {
            type: "object",
            properties: {
              id: { type: "number" },
              type: { enum: ["private", "group", "supergroup", "channel"] },
              username: { type: "string" },
              title: { type: "string" },
              firstName: { type: "string" },
              lastName: { type: "string" },
              isForum: { type: "boolean" },
              description: { type: "string" },
              bio: { type: "string" },
              reporterTgBotId: { type: "number" },
            },
          },
        },
      },
      async ({ body }) => {
        await this.ready;

        await this.markup.upsertChat(body.reporterTgBotId, body.id, body.title);

        await this.telemetry.trackChat(body);
      },
    );
  }

  private async installTelemetryTrackMessage() {
    await this.service.post<{ Body: MessageInfo }>(
      this.telemetryTrackMessagePath,
      {
        // onRequest: [this.verifyToken],
        schema: {
          body: {
            type: "object",
            properties: {
              id: { type: "number" },
              type: { enum: ["text", "media"] },
              threadId: { type: "number" },
              fromTgUserId: { type: "number" },
              senderTgChatId: { type: "number" },
              date: { type: "number" },
              tgChatId: { type: "number" },
              isTopic: { type: "boolean" },
              text: { type: "string" },
              caption: { type: "string" },
              reporterTgBotId: { type: "number" },
            },
          },
        },
      },
      async ({ body }) => {
        await this.ready;

        await this.markup.insertExample({
          tgMessageId: body.id,
          tgChatId: body.tgChatId,
          date: body.date,
          text: body.text,
          caption: body.caption,
        });

        await this.telemetry.trackMessage(body);
      },
    );
  }

  private async installTelemetryTrackPrediction() {
    await this.service.post<{
      Body: Omit<Prediction, "reason"> &
        Partial<Pick<Prediction, "reason">> & {
          tgMessageId: number;
          tgChatId: number;
          reporterTgBotId: number;
        };
    }>(
      this.telemetryTrackPredictionPath,
      {
        // onRequest: [this.verifyToken],
        schema: {
          body: {
            type: "object",
            properties: {
              tgMessageId: { type: "number" },
              tgChatId: { type: "number" },
              reason: { enum: ["classifier", "duplicate", "totem", "cas"] },
              value: { enum: ["spam", "ham"] },
              confidence: { type: "number" },
              reporterTgBotId: { type: "number" },
            },
          },
        },
      },
      async ({ body }) => {
        await this.markup.insertLabel({
          tgMessageId: body.tgMessageId,
          tgChatId: body.tgChatId,
          label: body.value,
          issuer: body.reason,
        });

        await this.telemetry.trackPrediction(
          body.tgMessageId,
          body,
          body.reporterTgBotId,
        );
      },
    );
  }

  private async installMarkupChats() {
    await this.service.get<{
      Querystring: {
        tgBotId: number;
      };
    }>(
      this.markupChatsPath,
      {
        schema: {
          querystring: {
            type: "object",
            required: ["tgBotId"],
            properties: {
              tgBotId: { type: "number" },
            },
          },
        },
      },
      async ({ query: { tgBotId } }) => {
        await this.ready;

        const chats = await this.markup.listChatsByBotId(tgBotId);

        return Promise.all(
          chats.map(async (chat) =>
            Object.assign(chat, {
              latestExample: await this.markup.getExampleByTgMessageId(
                chat.latestTgMessageId,
              ),
            }),
          ),
        );
      },
    );
  }

  private async installMarkupExamples() {
    await this.service.get<{
      Querystring: {
        tgChatId: number;
      };
    }>(
      this.markupExamplesPath,
      {
        schema: {
          querystring: {
            type: "object",
            required: ["tgChatId"],
            properties: {
              tgChatId: { type: "number" },
            },
          },
        },
      },
      async ({ query: { tgChatId } }) => {
        await this.ready;

        return this.markup.listExamplesByChatId(tgChatId);
      },
    );
  }

  private async installMarkupLabels() {
    await this.service.get<{
      Querystring: {
        tgMessageId: number;
        issuer: string;
      };
    }>(
      this.markupLabelsPath,
      {
        schema: {
          querystring: {
            type: "object",
            required: ["tgMessageId", "issuer"],
            properties: {
              tgMessageId: { type: "number" },
              issuer: { type: "string" },
            },
          },
        },
      },
      async ({ query: { tgMessageId, issuer } }) => {
        return this.markup.listLabelsByMessageIdAndIssuer(tgMessageId, issuer);
      },
    );
  }

  private async installMarkupMembers() {
    await this.service.get<{
      Querystring: {
        tgUserId: number;
      };
    }>(
      this.markupMemberPath,
      {
        schema: {
          querystring: {
            type: "object",
            required: ["tgUserId"],
            properties: {
              tgUserId: { type: "number" },
            },
          },
        },
      },
      async ({ query: { tgUserId } }) => {
        await this.ready;

        return this.markup.getMemberByTgUserId(tgUserId);
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
        botExternalId: number;
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
              state: { enum: ["starting", "stopping"] },
            },
          },
        },
      },
      async ({ body, params: { botExternalId } }) => {
        await this.ready;

        await this.bots.update({ id: botExternalId, ...body });
      },
    );
  }

  private async installBotsRemoveRoute() {
    await this.service.delete<{
      Params: {
        botExternalId: number;
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
      async ({ params: { botExternalId } }) => {
        await this.bots.remove(botExternalId);
      },
    );
  }

  private async installBotsStateRoute() {
    await this.service.get<{
      Params: {
        externalBotId: number;
      };
    }>(
      this.botsStatePath,
      {
        schema: {
          params: {
            type: "object",
            properties: {
              externalBotId: { type: "number" },
            },
          },
        },
      },
      async ({ params: { externalBotId } }) => {
        await this.ready;

        const data = await this.bots.get(externalBotId);

        return data?.state ?? null;
      },
    );
  }

  private async installBotsConvergeRoute() {
    await this.service.post<{
      Querystring: {
        botId: number;
      };
    }>(
      this.botsConvergePath,
      {
        schema: {
          querystring: {
            type: "object",
            properties: {
              botId: { type: "number" },
            },
          },
        },
      },
      async ({ query: { botId } }) => {
        await this.ready;

        return this.bots.convergeFor(botId);
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

        result = await this.modernTokenHandler(
          body.client_id,
          body.client_secret,
          body.scope,
        );

        return result;
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
