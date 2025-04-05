import path from 'node:path'
import createKnex, { Knex } from 'knex'
import type { Logger } from 'pino'
import type { ITotems } from "./types";

interface TotemRecord {
  id: number
  tgUserId: number
  createdAt: Date
  updatedAt: Date
}

export class Totems implements ITotems {
  private knex: Knex
  private ready: Promise<void>

  constructor(
    private modelsDirname: string,
    private modelId: string,
    private logger: Logger
  ) {
    this.knex = createKnex({
      client: 'sqlite3',
      connection: { filename: path.join(this.modelsDirname, `totems-${this.modelId}.sqlite3`) },
      useNullAsDefault: true,
      acquireConnectionTimeout: 60 * 60 * 60 * 1000
    })

    this.ready = this.initialize()
  }

  async has(tgUserId: number): Promise<boolean> {
    await this.ready

    const hasTotem = await this.hasTotemByTgUserId(tgUserId)

    return hasTotem
  }

  async add(tgUserId: number): Promise<void> {
    await this.ready

    await this.saveNewTotem(tgUserId)
  }

  async revoke(tgUserId: number): Promise<void> {
    await this.ready

    await this.deleteTotemByTgUserId(tgUserId)
  }

  private async initialize() {
    if (await this.hasTable())
      return

    await this.knex.schema.createTable('totems', table => {
      table.increments('id').primary()
      table.integer('tgUserId')

      table.dateTime('createdAt')
      table.dateTime('updatedAt').nullable()

      table.index('tgUserId')
    })
  }

  private async hasTable() {
    return this.knex.schema.hasTable('totems')
  }

  private async saveNewTotem(tgUserId: number) {
    return this.knex
      .insert({
        tgUserId,
        createdAt: new Date()
      })
      .into('totems')
  }

  private async hasTotemByTgUserId(tgUserId: number) {
    const record = await this.knex
      .select('id')
      .from('totems')
      .where('tgUserId', tgUserId)
      .first()

    return Boolean(record)
  }

  private deleteTotemByTgUserId(tgUserId: number) {
    return this.knex('totems')
      .delete()
      .where('tgUserId', tgUserId)
  }

  onCreated() { }

  onRemoved() { }
}
