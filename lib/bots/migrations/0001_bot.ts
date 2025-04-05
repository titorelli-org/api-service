import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('bot', table => {
    table.increments('id')

    table.integer('externalId')
    table.integer('accountId')
    table.string('accessToken')
    table.string('tgBotToken')
    table.string('dockhostImage')
    table.string('dockhostContainer')
    table.string('dockhostProject')
    table.string('state')
    table.string('scopes')

    table.index('externalId')
    table.index('accessToken')
    table.index('accountId')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('bot')
