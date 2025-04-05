import { Knex } from "knex";
import type { Db } from "../../Db";
import type { MessageInfo, MessageInfoRecord } from "../types";

export class MessageInfoRepository {
  constructor(private db: Db) { }

  private get knex() {
    return this.db.knex as Knex<MessageInfoRecord, MessageInfoRecord[]>
  }

  async insert(messageInfo: MessageInfo) {
    await this.knex
      .insert({
        ...messageInfo,
        id: undefined,
        tgMessageId: messageInfo.id,
      })
      .into('messageInfo')
  }

  async getByTgMessageId(tgMessageId: number) {
    return this.knex
      .select('*')
      .from('messageInfo')
      .where('tgMessageId', tgMessageId)
      .first<MessageInfoRecord>()
  }
}
