import { UnlabeledExample, Prediction, LabeledExample } from "../../types";
import type { IModel } from "./IModel";
import { env } from "../../../env";

export class RemoteModel implements IModel {
  public type = "remote" as const;

  async predict({ text }: UnlabeledExample): Promise<Prediction | null> {
    const url = new URL("/predict", env.MODEL_ORIGIN);

    const resp = await fetch(url, {
      method: "POST",
      body: JSON.stringify({ text }),
      headers: { "Content-Type": "application/json" },
    });

    const result = await resp.json();

    return result;
  }

  async train({ text, label }: LabeledExample): Promise<void> {
    const url = new URL("/train", env.MODEL_ORIGIN);

    await fetch(url, {
      method: "POST",
      body: JSON.stringify({ text, label }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async trainBulk(examples: LabeledExample[]): Promise<void> {
    const url = new URL("/trainBulk", env.MODEL_ORIGIN);

    await fetch(url, {
      method: "POST",
      body: JSON.stringify(examples),
      headers: { "Content-Type": "application/json" },
    });
  }
}
