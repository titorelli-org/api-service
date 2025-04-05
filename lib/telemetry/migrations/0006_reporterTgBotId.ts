import { Knex } from "knex";

export const up = (knex: Knex) => Promise.all([
  knex.schema.alterTable('chatInfo', table => {
    table.integer('reporterTgBotId').nullable()
  }),
  knex.schema.table('memberInfo', table => {
    table.integer('reporterTgBotId').nullable()
  }),
  knex.schema.table('messageInfo', table => {
    table.integer('reporterTgBotId').nullable()
  }),
  knex.schema.table('predictions', table => {
    table.integer('reporterTgBotId').nullable()
  }),
])

export const down = (knex: Knex) => Promise.all([
  knex.schema.alterTable('chatInfo', table => table.dropColumn('reporterTgBotId')),
  knex.schema.alterTable('memberInfo', table => table.dropColumn('reporterTgBotId')),
  knex.schema.alterTable('messageInfo', table => table.dropColumn('reporterTgBotId')),
  knex.schema.alterTable('predictions', table => table.dropColumn('reporterTgBotId')),
])
