import { type Knex } from 'knex'
import type { Db } from "../../Db";
import type { ChatRecord } from "../types";

export class ChatRepository {
  constructor(private db: Db) { }

  private get knex() {
    return this.db.knex as Knex<ChatRecord, ChatRecord[]>
  }

  async upsert(tgBotId: number, tgChatId: number, name: string) {
    const previous = await this.knex
      .select(['id', 'name'])
      .where({ tgChatId })
      .from('chats')
      .first<Pick<ChatRecord, 'id' | 'name'>>()

    if (previous == null) {
      await this.knex.insert({
        tgChatId,
        tgBotId,
        name,
        createdAt: new Date().toISOString()
      })
        .into('chats')
    } else
      if (previous.name !== name) {
        await this.knex('chats')
          .update({ name, updatedAt: new Date().toISOString() })
          .where({ id: previous.id })
      }
  }

  async updateLatestMessage(tgChatId: number, tgMessageId: number) {
    const exist = await this.knex
      .select('id')
      .where({ tgChatId })
      .from('chats')
      .first()

    if (exist) {
      await this.knex('chats')
        .update({ latestTgMessageId: tgMessageId })
        .where({ tgChatId })
    }
  }

  async listByBotId(tgBotId: number) {
    return this.knex
      .select<ChatRecord[]>('*')
      .from('chats')
      .where('tgBotId', tgBotId)
  }
}
