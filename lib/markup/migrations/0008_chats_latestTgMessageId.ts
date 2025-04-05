import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.alterTable('chats', table => {
    table.integer('latestTgMessageId')
  })

export const down = (knex: Knex) =>
  knex.schema.alterTable('chats', table => {
    table.dropColumn('latestTgMessageId')
  })
