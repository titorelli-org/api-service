import { Knex } from "knex";
import { omit } from 'lodash'
import type { Db } from "../../Db";
import type { ChatInfo, ChatInfoRecord } from "../types";

export class ChatInfoRepository {
  constructor(private db: Db) { }

  private get knex() {
    return this.db.knex as Knex<ChatInfoRecord, ChatInfoRecord[]>
  }

  async insertIfChanged(chatInfo: ChatInfo) {
    const lastValue = await this.knex
      .select('id')
      .from('chatInfo')
      .where('tgChatId', chatInfo.id)
      .andWhere('reporterTgBotId', chatInfo.reporterTgBotId)
      .andWhere('type', chatInfo.type ?? null)
      .andWhere('username', chatInfo.username ?? null)
      .andWhere('title', chatInfo.title ?? null)
      .andWhere('firstName', chatInfo.firstName ?? null)
      .andWhere('lastName', chatInfo.lastName ?? null)
      .andWhere('isForum', chatInfo.isForum ?? null)
      .andWhere('description', chatInfo.description ?? null)
      .andWhere('bio', chatInfo.bio ?? null)
      .first()

    if (!lastValue) {
      await this.knex
        .insert({
          ...omit(chatInfo, 'id'),
          tgChatId: chatInfo.id
        })
        .into('chatInfo')
    }
  }
}
