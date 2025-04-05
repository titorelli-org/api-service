// import { NaturalWorker } from './NaturalWorker'
import path from 'node:path'
import type { Logger } from 'pino'

import type { UnlabeledExample, Prediction, LabeledExample, StemmerLanguage, Labels } from '../../types'
import type { IModel } from './IModel'
import { LogisticRegressionWorker } from './LogisticRegressionWorker'
import { PorterStemmerRu } from 'natural'

export class LogisticRegressionModel implements IModel {
  private worker: LogisticRegressionWorker

  public type = 'logistic-regression' as const

  constructor(
    private modelId: string,
    private modelFilename: string,
    private lang: StemmerLanguage,
    private logger: Logger
  ) {
    this.worker = new LogisticRegressionWorker({ modelFilename: this.modelFilename })

    const parsedModelFilename = path.parse(this.modelFilename)

    // this.worker = new NaturalWorker({
    //   modelFilename: path.format({
    //     ...parsedModelFilename,
    //     base: parsedModelFilename.name + '-previous' + path.extname(this.modelFilename)
    //   })
    // })
  }

  async predict(example: UnlabeledExample): Promise<Prediction | null> {
    // const { value, label } = await this.worker.classify(example.text)
    const score = await this.worker.classify(PorterStemmerRu.tokenizeAndStem(example.text).join(' '))
    const label = score <= 0.5 ? 'ham' : 'spam'

    return {
      value: label as Labels,
      confidence: score,
      reason: 'classifier'
    }
  }

  async train(example: LabeledExample): Promise<void> {
    await this.trainBulk([example])
  }

  async trainBulk(examples: LabeledExample[]): Promise<void> {
    await this.worker.trainBulk(examples)
  }

  onCreated(): void {
    // Do nothing
  }

  onRemoved(): void {
    // Do nothing
  }
}
