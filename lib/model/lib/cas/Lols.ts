import type { Logger } from 'pino'
import createKnex, { Knex } from 'knex'
import type { ICas } from './types'

export type LolsAccountRespData = {
  ok: boolean
  user_id: number
  banned: boolean
}

export type LolsRecord = {
  id: number
  tgUserId: number
}

export class LolsAntispam implements ICas {
  private knex: Knex
  private ready: Promise<void>

  constructor(
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

  async has(tgUserId: number): Promise<boolean> {
    await this.ready

    const hasInCache = await this.getId(tgUserId)

    if (hasInCache) {
      return true
    }

    const banned = await this.makeRequest(tgUserId)

    if (banned) {
      await this.saveId(tgUserId)
    }

    return banned ?? false
  }

  async add(id: number): Promise<void> {
    await this.saveId(id)
  }

  private async makeRequest(tgUserId: number) {
    const url = new URL('/account', 'https://api.lols.bot')
    url.searchParams.set('id', String(tgUserId))

    const resp = await fetch(url)

    const data = await resp.json() as Awaited<LolsAccountRespData>

    if (data.ok) {
      return data.banned
    }

    return null
  }

  private async initialize() {
    if (await this.hasTable())
      return

    await this.knex.schema.createTable('lols', table => {
      table.increments('id').primary()
      table.integer('tgUserId')

      table.index('tgUserId')
    })
  }

  private async hasTable() {
    return this.knex.schema.hasTable('lols')
  }

  private async getId(tgUserId: number) {
    return this.knex
      .select<LolsRecord[]>('*')
      .from('lols')
      .where('tgUserId', tgUserId)
      .first()
  }

  private async saveId(tgUserId: number) {
    await this.knex
      .insert({ tgUserId })
      .into('lols')
  }

  private async removeId(tgUserId: number) {
    await this.knex('lols')
      .delete()
      .where('tgUserId', tgUserId)
  }
}
