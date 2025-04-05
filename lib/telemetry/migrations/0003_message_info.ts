import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('messageInfo', table => {
    table.increments('id')

    table.integer('tgMessageId')
    table.string('type').nullable()
    table.integer('threadId').nullable()
    table.integer('fromTgUserId').nullable()
    table.integer('senderTgChatId').nullable()
    table.string('date').nullable()
    table.integer('tgChatId')
    table.boolean('isTopic').nullable()
    table.string('text').nullable()
    table.string('caption').nullable()

    table.index('tgMessageId')
    table.index('threadId')
    table.index('senderTgChatId')
    table.index('tgChatId')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('messageInfo')
