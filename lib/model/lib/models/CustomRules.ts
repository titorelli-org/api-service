import type { Logger } from 'pino'
import type { UnlabeledExample, Prediction, LabeledExample } from '../../types'
import type { IModel } from './IModel'

export class CustomRulesModel implements IModel {
  private casinoRegexp = /казин/i
  private slotRegexp = /слот/i
  private winRegexp = /выи/i

  public type = 'custom-rules' as const

  constructor(
    private logger: Logger
  ) { }

  async predict(example: UnlabeledExample): Promise<Prediction | null> {
    if (this.casinoRegexp.test(example.text)) {
      return this.returnSpamPrediction()
    }

    if (this.slotRegexp.test(example.text) && this.winRegexp.test(example.text)) {
      return this.returnSpamPrediction()
    }

    return null
  }

  async train(example: LabeledExample): Promise<void> {
    console.warn('Train not implemented for custom-rules model')
  }

  async trainBulk(examples: LabeledExample[]): Promise<void> {
    console.warn('Train bulk not implemented for custom-rules model')
  }

  private returnSpamPrediction(): Prediction {
    return {
      value: 'spam',
      confidence: 1,
      // reason: 'rule'
    }
  }

  onCreated(): void {
    // Do nothing
  }

  onRemoved(): void {
    // Do nothing
  }
}
