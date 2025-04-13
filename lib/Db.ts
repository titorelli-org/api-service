import createKnex from "knex";
import pino from "pino";

const logger = pino({ name: "knex" });

export class Db {
  private _knex: ReturnType<typeof createKnex>;

  constructor(private _dbFilename: string, private _migrationsDir?: string) {
    this._knex = createKnex({
      client: "sqlite3",
      connection: { filename: this._dbFilename },
      useNullAsDefault: true,
      log: logger,
    });

    this.initialize();
  }

  get knex() {
    return this._knex;
  }

  private async initialize() {
    if (this._migrationsDir == null) return;

    await this._knex.migrate.latest({
      directory: this._migrationsDir,
    });
  }
}
