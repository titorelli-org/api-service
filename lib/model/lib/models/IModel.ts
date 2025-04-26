import type { LabeledExample, ModelType, Prediction, UnlabeledExample } from "../../types";

export interface IModel {
  get type(): ModelType

  predict(example: UnlabeledExample): Promise<Prediction | null>

  train(example: LabeledExample): Promise<void>

  trainBulk(examples: LabeledExample[]): Promise<void>
}
