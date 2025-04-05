import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('examples', table => {
    table.increments('id')

    table.integer('tgMessageId')
    table.integer('tgChatId')
    table.string('date').nullable()
    table.string('text').nullable()
    table.string('caption').nullable()

    table.dateTime('createdAt')

    table.index('tgMessageId')
    table.index('tgChatId')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('examples')
