import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('labels', table => {
    table.increments('id')

    table.integer('tgMessageId')
    table.integer('tgChatId')
    table.string('label')
    table.string('issuer')
    
    table.dateTime('updatedAt').nullable()
    table.dateTime('createdAt')

    table.index('tgMessageId')
    table.index('tgChatId')
    table.index('issuer')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('labels')
