import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('member_usernames', table => {
    table.increments('id')

    table.integer('memberId')

    table.dateTime('createdAt')
    table.string('username')

    table.index('memberId')
    table.index('username')

    table.foreign('memberId')
      .references('id')
      .inTable('members')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('member_usernames')
