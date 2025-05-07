import type { FastifyInstance } from "fastify";
import type { ICas } from "../../../model";
import type { Logger } from "pino";

export class CasPlugin {
  public readonly ready: Promise<void>;
  private readonly casPredictPath = "/cas/predict";
  private readonly casTrainPath = "/cas/train";

  constructor(
    private service: FastifyInstance,
    private cas: ICas,
    private logger: Logger,
  ) {
    this.ready = this.initialize();
  }

  private async initialize() {
    await this.installCasPredictRoute();
    await this.installCasTrainRoute();
  }

  private async installCasPredictRoute() {
    await this.service.post<{
      Body: {
        tgUserId: number;
      };
    }>(
      this.casPredictPath,
      {
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
}
