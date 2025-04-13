import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('bot', table => {
    table.increments('id')

    table.integer('externalId')
    table.string('accessToken')
    table.boolean('bypassTelemetry')
    table.integer('accountId')
    table.boolean('modelId')
    table.string('tgBotToken')
    table.string('dockhostImage')
    table.string('dockhostContainer')
    table.string('dockhostProject')
    table.string('state').defaultTo('created')
    table.string('scopes').defaultTo('')

    table.index('externalId')
    table.index('accessToken')
    table.index('accountId')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('bot')
