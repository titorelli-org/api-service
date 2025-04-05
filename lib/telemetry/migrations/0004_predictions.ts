import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('predictions', table => {
    table.increments('id')

    table.integer('tgMessageId')
    table.integer('tgUserId')
    table.string('reason').nullable()
    table.string('label')
    table.float('confidence')

    table.index('tgMessageId')
    table.index('tgUserId')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('predictions')
