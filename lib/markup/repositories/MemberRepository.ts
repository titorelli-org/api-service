import { type Knex } from 'knex'
import type { Db } from "../../Db";
import { FirstnameRecord, LastnameRecord, UsernameRecord, type MemberRecord } from "../types";
import { isEqual } from 'lodash';

export class MemberRepository {
  constructor(private db: Db) { }

  private get knex() {
    return this.db.knex as Knex<MemberRecord, MemberRecord[]>
  }

  async upsert(data: Omit<MemberRecord, 'id' | 'createdAt' | 'updatedAt'>) {
    const previous = await this.knex
      .select(['id', 'languageCode', 'isPremium'])
      .where({ tgUserId: data.tgUserId })
      .from('members')
      .first<Pick<MemberRecord, 'id' | 'languageCode' | 'isPremium'>>()

    if (previous == null) {
      const result = await this.knex.insert({
        ...data,
        createdAt: new Date().toISOString()
      })
        .into('members')
        .returning<Pick<MemberRecord, 'id'>[]>('id')

      return result ? result[0]?.id : undefined
    } else {
      const changed = !isEqual(
        [previous.languageCode, previous.isPremium],
        [data.languageCode, data.isPremium]
      )

      if (changed) {
        await this.knex('members')
          .update({
            id: previous.id,
            languageCode: data.languageCode,
            isPremium: data.isPremium,
            updatedAt: new Date().toISOString()
          })
          .where({ id: previous.id })
      }
    }

    return previous.id
  }

  async upsertUsername(memberId: number, username: string) {
    const previous = await this.knex
      .select(['id'])
      .from('member_usernames')
      .where('username', username)
      .andWhere('memberId', memberId)
      .first<Pick<UsernameRecord, 'id'>>()

    if (previous == null) {
      await this.knex
        .insert({
          memberId,
          username,
          createdAt: new Date().toISOString()
        } as any)
        .into('member_usernames')
    }
  }

  async upsertFirstname(memberId: number, firstName: string) {
    const previous = await this.knex
      .select(['id'])
      .from('member_firstnames')
      .where('firstName', firstName)
      .andWhere('memberId', memberId)
      .first<Pick<FirstnameRecord, 'id'>>()

    if (previous == null) {
      await this.knex
        .insert({
          memberId,
          firstName,
          createdAt: new Date().toISOString()
        } as any)
        .into('member_firstnames')
    }
  }

  async upsertLastname(memberId: number, lastName: string) {
    const previous = await this.knex
      .select(['id'])
      .from('member_lastnames')
      .where('lastName', lastName)
      .andWhere('memberId', memberId)
      .first<Pick<LastnameRecord, 'id'>>()

    if (previous == null) {
      await this.knex
        .insert({
          memberId,
          lastName,
          createdAt: new Date().toISOString()
        } as any)
        .into('member_lastnames')
    }
  }

  async getByTgUserId(tgUserId: number) {
    return this.knex.transaction(async t => {
      const members = await t
        .select<MemberRecord[]>('*')
        .from('members')
        .where('tgUserId', tgUserId)

      return Promise.all(
        members.map(async ({ id }) => ({
          usernames: await t
            .select('*')
            .from('member_usernames')
            .where('memberId', id),
          firstNames: await t
            .select('*')
            .from('member_firstnames')
            .where('memberId', id),
          lastNames: await t
            .select('*')
            .from('member_lastnames')
            .where('memberId', id)
        }))
      )
    })
  }
}
