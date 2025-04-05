import { type Knex } from 'knex'
import type { Db } from "../../Db";
import type { ExampleRecord } from "../types";

export class ExampleRepository {
  constructor(private db: Db) { }

  private get knex() {
    return this.db.knex as Knex<ExampleRecord, ExampleRecord[]>
  }

  async insert(data: Omit<ExampleRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    await this.knex
      .insert<ExampleRecord>({
        ...data,
        createdAt: new Date().toISOString()
      })
      .into('examples')
  }

  async listByChatId(tgChatId: number) {
    return this.knex
      .select<ExampleRecord>('*')
      .where('tgChatId', tgChatId)
      .from('examples')
  }

  async getByTgMessageId(tgMessageId: number) {
    return this.knex
      .select('*')
      .from('examples')
      .where('tgMessageId', tgMessageId)
      .first<ExampleRecord>()
  }
}
