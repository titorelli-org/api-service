import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('chats', table => {
    table.increments('id')

    table.integer('tgChatId')
    table.integer('tgBotId')
    table.string('name')
    
    table.dateTime('updatedAt').nullable()
    table.dateTime('createdAt')

    table.index('tgChatId')
    table.index('tgBotId')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('chats')
