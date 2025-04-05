import { Knex } from "knex";
import type { Db } from "../../Db";
import type { MemberInfoRecord, UserInfo } from "../types";
import { omit } from "lodash";

export class MemberInfoRepository {
  constructor(private db: Db) { }

  private get knex() {
    return this.db.knex as Knex<MemberInfoRecord, MemberInfoRecord[]>
  }

  async insertIfChanged(userInfo: UserInfo) {
    const lastValue = await this.knex
      .select('id')
      .from('memberInfo')
      .where('tgUserId', userInfo.id)
      .andWhere('reporterTgBotId', userInfo.reporterTgBotId)
      .andWhere('isBot', userInfo.isBot ?? null)
      .andWhere('firstName', userInfo.firstName ?? null)
      .andWhere('lastName', userInfo.lastName ?? null)
      .andWhere('username', userInfo.username ?? null)
      .andWhere('languageCode', userInfo.languageCode ?? null)
      .andWhere('isPremium', userInfo.isPremium ?? null)
      .andWhere('addedToAttachmentMenu', userInfo.addedToAttachmentMenu ?? null)
      .first()

    if (!lastValue) {
      await this.knex
        .insert({
          ...omit(userInfo, 'id'),
          tgUserId: userInfo.id
        })
        .into('memberInfo')
    }
  }
}
