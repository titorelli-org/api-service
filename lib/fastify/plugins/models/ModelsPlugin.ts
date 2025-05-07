import type { FastifyInstance } from "fastify";
import type { ICas, IModel, LabeledExample, Prediction } from "../../../model";
import type { Logger } from "pino";
import { env } from "../../../env";
import { normalizeText } from "../../../misc";

export class ModelsPlugin {
  public readonly ready: Promise<void>;
  private readonly modelPredictPath = "/models/:modelId/predict";
  private readonly modelTrainPath = "/models/:modelId/train";
  private readonly modelTrainBulkPath = "/models/:modelId/train_bulk";
  private readonly modelExactMatchTrainPath =
    "/models/:modelId/exact_match/train";
  private readonly modelTotemsTrainPath = "/models/:modelId/totems/train";

  constructor(
    private service: FastifyInstance,
    private model: IModel,
    private cas: ICas,
    private logger: Logger,
  ) {
    this.ready = this.initialize();
  }

  private async initialize() {
    await this.installModelPredictRoute();
    await this.installModelTrainRoute();
    await this.installModelTrainBulkRoute();
    await this.installModelExactMatchTrainRoute();
    await this.installModelTotemsTrainRoute();
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

          console.log(247, "casPrediction:", casPrediction);

          if (casPrediction != null) {
            console.log(250);

            return casPrediction;
          }
        }

        return this.model.predict({ text });
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
          const url = new URL("/text", env.TEXT_ORIGIN);

          const formData = new FormData();

          formData.set("text", text);
          formData.set("metadata", JSON.stringify({ label, confidence: 1 }));
          formData.set("normalized", normalizeText(text));

          await fetch(url, {
            method: "PUT",
            body: formData,
            headers: {
              Authorization: `Basic ${btoa(env.PSK_U + ":" + env.PSK_P)}`,
            },
          });
        } catch (e) {
          this.logger.error(e, "Error while train text-storage");
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
}
