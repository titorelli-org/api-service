import { UnlabeledExample, Prediction, LabeledExample } from "../../types";
import type { IModel } from "./IModel";
import { env } from "../../../env";
import { createClient, serviceDiscovery, type ModelClient } from "@titorelli/client";

export class RemoteModel implements IModel {
  public type = "remote" as const;

  async predict({ text }: UnlabeledExample): Promise<Prediction | null> {
    const model = await this.getModelClient();

    return model.predict({ text });
  }

  async train(_: LabeledExample): Promise<void> {
    // Not implemented yet
  }

  async trainBulk(_examples: LabeledExample[]): Promise<void> {
    // Not implemented yet
  }

  private _modelClient: ModelClient | null = null;
  private async getModelClient() {
    if (this._modelClient) return this._modelClient;

    const { modelOrigin } = await serviceDiscovery(env.SITE_ORIGIN);

    const model = await createClient("model", modelOrigin, "api");

    this._modelClient = model;

    return model;
  }
}
