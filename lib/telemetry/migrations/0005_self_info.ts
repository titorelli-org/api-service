import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('selfInfo', table => {
    table.increments('id')

    table.integer('tgUserId')
    table.string('firstName').nullable()
    table.string('lastName').nullable()
    table.string('username').nullable()
    table.string('languageCode').nullable()
    table.boolean('isPremium').nullable()
    table.boolean('addedToAttachmentMenu').nullable()
    table.boolean('isBot').nullable()
    table.boolean('canJoinGroups').nullable()
    table.boolean('canReadAllGroupMessages').nullable()
    table.boolean('supportsInlineQueries').nullable()

    table.index('tgUserId')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('selfInfo')
