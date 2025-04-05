import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('memberInfo', table => {
    table.increments('id')

    table.integer('tgUserId')
    table.boolean('isBot').nullable()
    table.string('firstName').nullable()
    table.string('lastName').nullable()
    table.string('username').nullable()
    table.string('languageCode').nullable()
    table.boolean('isPremium').nullable()
    table.boolean('addedToAttachmentMenu').nullable()

    table.index('tgUserId')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('memberInfo')
