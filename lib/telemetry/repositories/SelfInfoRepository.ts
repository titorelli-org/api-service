import { Knex } from "knex";
import { omit } from 'lodash'
import type { Db } from "../../Db";
import type { SelfInfoRecord, SelfInfo } from "../types";

export class SelfInfoRepository {
  constructor(private db: Db) { }

  private get knex() {
    return this.db.knex as Knex<SelfInfoRecord, SelfInfoRecord[]>
  }

  async insertIfChanged(selfInfo: SelfInfo) {
    const lastValue = await this.knex
      .select('id')
      .from('selfInfo')
      .where('tgUserId', selfInfo.id)
      .andWhere('firstName', selfInfo.firstName ?? null)
      .andWhere('lastName', selfInfo.lastName ?? null)
      .andWhere('username', selfInfo.username ?? null)
      .andWhere('languageCode', selfInfo.languageCode ?? null)
      .andWhere('isPremium', selfInfo.isPremium ?? null)
      .andWhere('addedToAttachmentMenu', selfInfo.addedToAttachmentMenu ?? null)
      .andWhere('isBot', selfInfo.isBot ?? null)
      .andWhere('canJoinGroups', selfInfo.canJoinGroups ?? null)
      .andWhere('canReadAllGroupMessages', selfInfo.canReadAllGroupMessages ?? null)
      .andWhere('supportsInlineQueries', selfInfo.supportsInlineQueries ?? null)
      .first()

    if (!lastValue) {
      await this.knex
        .insert({
          ...omit(selfInfo, 'id'),
          tgUserId: selfInfo.id
        })
        .into('selfInfo')
    }
  }
}
