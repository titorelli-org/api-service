import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('chatInfo', table => {
    table.increments('id')

    table.integer('tgChatId')
    table.string('type').nullable()
    table.string('username').nullable()
    table.string('title').nullable()
    table.string('firstName').nullable()
    table.string('lastName').nullable()
    table.boolean('isForum').nullable()
    table.string('description').nullable()
    table.string('bio').nullable()

    table.index('tgChatId')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('chatInfo')
