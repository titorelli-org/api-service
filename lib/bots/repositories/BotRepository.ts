import type { Logger } from "pino";
import type { Db } from "../../Db";
import type { BotRecord } from "../index";

export type CreateProps = {
  externalId: number;
  accessToken: string;
  bypassTelemetry: boolean;
  accountId: number;
  modelId: number;
  tgBotToken: string;
  scopes: string;
  dockhostImage: string;
  dockhostProject: string;
  dockhostContainer: string;
};

export type UpdateProps = {
  bypassTelemetry?: boolean;
  modelId?: number;
  tgBotToken?: string;
};

export class BotRepository {
  constructor(private db: Db, private logger: Logger) {}

  public async create({
    externalId,
    accessToken,
    bypassTelemetry,
    accountId,
    modelId,
    tgBotToken,
    dockhostContainer,
    dockhostImage,
    dockhostProject,
    scopes,
  }: CreateProps) {
    const [{ id }] = await this.db.knex
      .insert<BotRecord>({
        externalId,
        accessToken,
        bypassTelemetry,
        accountId,
        modelId,
        tgBotToken,
        dockhostImage,
        dockhostContainer,
        dockhostProject,
        state: "created",
        scopes,
      })
      .into("bot")
      .returning<{ id: number }[]>(["id"]);

    return id;
  }

  public async getById(id: number) {
    return this.db.knex
      .select<BotRecord>("*")
      .from("bot")
      .where("id", id)
      .first();
  }

  public async getByExternalId(externalId: number) {
    return this.db.knex
      .select<BotRecord>("*")
      .from("bot")
      .where("externalId", externalId)
      .first();
  }

  public async updateById(id: number, props: UpdateProps) {
    await this.db.knex("bot").update<BotRecord>(props).where("id", id);
  }

  public async removeById(id: number) {
    await this.db.knex("bot").delete().where("id", id);
  }

  public async setStateById(id: number, state: BotRecord["state"]) {
    await this.db.knex.update({ state }).into("bot").where("id", id);
  }
}
