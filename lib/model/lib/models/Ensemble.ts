import { UnlabeledExample, Prediction, LabeledExample, ModelType } from "../../types";
import type { IModel } from "./IModel";

export class EnsembleModel implements IModel {
  public type = 'ensemble' as const

  constructor(
    private modelId: string,
    private models: IModel[]
  ) {
  }

  async predict(example: UnlabeledExample): Promise<Prediction | null> {
    const exactMatchModel = this.getModelByType('exact-match')!
    const logisticRegressionModel = this.getModelByType('logistic-regression')!

    const emPrediction = await exactMatchModel.predict(example)

    if (emPrediction)
      return emPrediction

    const lrPrediction = await logisticRegressionModel.predict(example)

    return lrPrediction
  }

  async train(example: LabeledExample): Promise<void> {
    await Promise.all(
      this.models.map(model => model.train(example))
    )
  }

  async trainBulk(examples: LabeledExample[]): Promise<void> {
    await Promise.all(
      this.models.map(model => model.trainBulk(examples))
    )
  }

  getModelByType(type: ModelType) {
    return this.models.find((model) => model.type === type)
  }

  onCreated(): void {
    for (const model of this.models) {
      model.onCreated()
    }
  }

  onRemoved(): void {
    for (const model of this.models) {
      model.onRemoved()
    }
  }
}
