import type { LabeledExample, ModelType, Prediction, UnlabeledExample } from "../../types";

export interface IModel {
  get type(): ModelType

  predict(example: UnlabeledExample): Promise<Prediction | null>

  train(example: LabeledExample): Promise<void>

  trainBulk(examples: LabeledExample[]): Promise<void>

  /**
   * Callback invoked when model removed from store
   */
  onRemoved(): void

  /**
   * Callback invoked when model instance created in store
   */
  onCreated(): void
}
