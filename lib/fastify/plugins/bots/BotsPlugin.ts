import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { BotsService } from "../../../bots";
import type { Logger } from "pino";

export class BotsPlugin {
  public readonly ready: Promise<void>;
  private readonly botsCreatePath = "/bots";
  private readonly botsListPath = "/bots";
  private readonly botsUpdatePath = "/bots/:botExtrnalId";
  private readonly botsStatePath = "/bots/:botExtrnalId/state";
  private readonly botsRemovePath = "/bots/:botExtrnalId";
  private readonly botsLivenessPath = "/bots/liveness";
  private readonly truncateBotDbPath = "/bots/truncate/:token";

  constructor(
    private service: FastifyInstance,
    private bots: BotsService,
    private logger: Logger,
  ) {
    this.ready = this.initialize();
  }

  private async initialize() {
    await this.installBotsCreateRoute();
    await this.installBotsListRoute();
    await this.installBotsUpdateRoute();
    await this.installBotsRemoveRoute();
    await this.installBotsStateRoute();
    await this.installBotsLivenessRoute();
    await this.installBotsTruncateRoute();
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
        accessToken: string;
      };
    }>(
      this.botsListPath,
      {
        schema: {
          querystring: {
            type: "object",
            required: ["accountId"],
            properties: {
              accountId: { type: "number" },
              accessToken: { type: "string" },
            },
          },
        },
      },
      async ({ query: { accountId, accessToken } }) => {
        if (accessToken) {
          return this.bots.listByAccessToken(accessToken);
        }

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
        accessToken?: string;
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
              accessToken: { type: "string" },
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

  private async installBotsTruncateRoute() {
    let hash = createHash("SHA-256")
      .update(process.env.JWT_SECRET)
      .update("--pepper--")
      .digest("hex");

    this.logger.info("TRUNCATE DB TOKEN: %s", btoa(hash));

    await this.service.post<{
      Params: {
        token: string;
      };
    }>(
      this.truncateBotDbPath,
      {
        schema: {
          tags: ["X-HIDDEN"],
          params: {
            type: "object",
            properties: {
              token: { type: "string" },
            },
          },
        },
      },
      async ({ params: { token } }) => {
        if (hash !== atob(token)) {
          return new Error("Bad token");
        }

        await this.bots.truncateDb();
      },
    );
  }
}
