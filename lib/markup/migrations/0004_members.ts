import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('members', table => {
    table.increments('id')

    table.integer('tgUserId')
    table.string('languageCode')
    table.boolean('isPremium')

    table.dateTime('createdAt')
    table.dateTime('updatedAt').nullable()

    table.index('tgUserId')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('members')
