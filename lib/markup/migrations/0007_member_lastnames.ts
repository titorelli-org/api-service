import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('member_lastnames', table => {
    table.increments('id')

    table.integer('memberId')
    table.string('lastName')

    table.dateTime('createdAt')

    table.index('memberId')
    table.index('lastName')

    table.foreign('memberId')
      .references('id')
      .inTable('members')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('member_lastnames')
