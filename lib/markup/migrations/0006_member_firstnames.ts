import { Knex } from "knex";

export const up = (knex: Knex) =>
  knex.schema.createTable('member_firstnames', table => {
    table.increments('id')

    table.integer('memberId')
    table.string('firstName')

    table.dateTime('createdAt')

    table.index('memberId')
    table.index('firstName')

    table.foreign('memberId')
      .references('id')
      .inTable('members')
  })

export const down = (knex: Knex) =>
  knex.schema.dropTable('member_firstnames')
