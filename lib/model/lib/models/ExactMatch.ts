import { createHash } from 'node:crypto'
import createKnex, { Knex } from 'knex'
import { PorterStemmerRu } from 'natural'
import type { Logger } from 'pino'
import type { UnlabeledExample, Prediction, LabeledExample } from '../../types'
import type { IModel } from './IModel'

interface ExampleRecord {
  id: string
  textHash: string
  label: 'spam' | 'ham'
  confidence: number
  createdAt: Date
  updatedAt: Date
}

export class ExactMatchModel implements IModel {
  public type = 'exact-match' as const

  private knex: Knex
  private ready: Promise<void>

  constructor(
    private modelId: string,
    private modelFilename: string,
    private logger: Logger
  ) {
    this.knex = createKnex({
      client: 'sqlite3',
      connection: { filename: this.modelFilename },
      useNullAsDefault: true,
      acquireConnectionTimeout: 60 * 60 * 60 * 1000
    })

    this.ready = this.initialize()
  }

  async predict(example: UnlabeledExample): Promise<Prediction | null> {
    await this.ready

    const record = await this.getExamplePredictionByText(example.text)

    if (record) {
      return {
        value: record.label,
        confidence: record.confidence,
        reason: 'duplicate'
      }
    }

    return null
  }

  async train(example: LabeledExample): Promise<void> {
    await this.ready

    await this.saveNewExample({
      ...example,
      confidence: 1 // TODO: Think how to pass via interface
    })
  }

  async trainBulk(examples: LabeledExample[]): Promise<void> {
    await this.ready

    const t = await this.knex.transaction()

    for (const example of examples) {
      this.saveNewExample({
        ...example,
        confidence: 1  // TODO: Think how to pass via interface
      })
    }

    await t.commit()
  }

  private async hasTable() {
    return this.knex.schema.hasTable('examples')
  }

  private async initialize() {
    if (await this.hasTable())
      return

    await this.knex.schema.createTable('examples', table => {
      table.increments('id').primary()
      table.text('textHash').notNullable()
      table.enum('label', ['spam', 'ham'])
      table.float('confidence') // Awlays 1 for now

      table.dateTime('createdAt')
      table.dateTime('updatedAt').nullable()

      table.index('textHash')
    })
  }

  private async saveNewExample(data: {
    text: string,
    label: 'spam' | 'ham'
    confidence: number
  }, t?: Knex.Transaction) {
    let query = this.knex
      .insert({
        textHash: this.hashExample(data),
        label: data.label,
        confidence: data.confidence,
        createdAt: new Date()
      })
      .into('examples')

    if (t) {
      query = query.transacting(t)
    }

    return query
  }

  private async getExamplePredictionByText(text: string) {
    return this.knex
      .select<(Pick<ExampleRecord, 'label' | 'confidence'>)[]>(['label', 'confidence'])
      .from('examples')
      .where('textHash', this.hashExample({ text }))
      .first()
  }

  private hashExample(example: UnlabeledExample | LabeledExample) {
    const words = PorterStemmerRu.tokenizeAndStem(example.text)
    const hasher = createHash('sha-256')

    for (const word of words) {
      hasher.update(word)
    }

    return hasher.digest('hex')
  }

  onRemoved(): void {

  }

  onCreated(): void {

  }
}
