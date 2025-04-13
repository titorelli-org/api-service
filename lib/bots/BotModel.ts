import { ContainerModel } from "./ContainerModel";
import { env } from "../env";
import type { Db } from "../Db";
import type { BotRecord } from "./BotsService";
import type { ContainerNameGenerator } from "./ContainerNameGenerator";
import type { DockhostService } from "./dockhost";
import type { Logger } from "pino";

export type BotModelConfig = {
  db: Db;
  nameGenerator: ContainerNameGenerator;
  dockhost: DockhostService;
  logger: Logger;
};

export class BotModel implements BotRecord {
  public readonly id: number;
  public readonly externalId: number;
  public readonly accountId: number;
  public readonly accessToken: string;
  public readonly bypassTelemetry: boolean;
  public readonly modelId: number;
  public readonly tgBotToken: string;
  public readonly dockhostImage: string;
  public readonly dockhostContainer: string;
  public readonly dockhostProject: string;
  public readonly state:
    | "created"
    | "starting"
    | "running"
    | "stopping"
    | "stopped"
    | "failed"
    | "deleted";
  public readonly scopes: string;

  private readonly db: Db;
  private readonly nameGen: ContainerNameGenerator;
  private readonly dockhost: DockhostService;
  private readonly container?: ContainerModel;
  private readonly logger: Logger;
  private readonly siteOrigin = env.SITE_ORIGIN;

  public static getClientId(id: number, accountId: number) {
    return btoa([id, accountId].map(String).map(btoa).join(":"));
  }

  public static parseClientId(clientId: string) {
    return atob(clientId)
      .split(":")
      .map((s) => atob(s))
      .map(Number) as [number, number];
  }

  public static async create({
    externalId,
    accessToken,
    bypassTelemetry,
    accountId,
    modelId,
    tgBotToken,
    scopes,
    dockhostImage,
    dockhostProject,
    db,
    nameGenerator,
    dockhost,
    logger,
  }: {
    externalId: number;
    accessToken: string;
    bypassTelemetry: boolean;
    accountId: number;
    modelId: number;
    tgBotToken: string;
    scopes: string;
    dockhostImage: string;
    dockhostProject: string;
    db: Db;
    nameGenerator: ContainerNameGenerator;
    dockhost: DockhostService;
    logger: Logger;
  }) {
    const dockhostContainer = nameGenerator.generate(accountId, externalId);
    const [{ id }] = await db.knex
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
      .returning<{ id: number }[]>(["id", "state"]);

    return new BotModel(
      {
        id,
        externalId,
        accountId,
        accessToken,
        bypassTelemetry,
        modelId,
        tgBotToken,
        dockhostImage,
        dockhostContainer,
        dockhostProject,
        state: "created",
        scopes,
      },
      {
        db,
        nameGenerator,
        dockhost,
        logger,
      },
    );
  }

  public static async getById(id: number, config: BotModelConfig) {
    const record = await config.db.knex
      .select<BotRecord>("*")
      .from("bot")
      .where("id", id)
      .first();

    return record ? new BotModel(record, config) : null;
  }

  public static async getByExternalId(
    externalId: number,
    config: BotModelConfig,
  ) {
    const record = await config.db.knex
      .select<BotRecord>("*")
      .from("bot")
      .where("externalId", externalId)
      .first();

    return record ? new BotModel(record, config) : null;
  }

  public static async getByClientId(clientId: string, config: BotModelConfig) {
    const [id] = atob(clientId)
      .split(":")
      .map((s) => atob(s))
      .map(Number) as [number, number];

    return this.getById(id, config);
  }

  constructor(
    record: BotRecord,
    { db, nameGenerator, dockhost, logger }: BotModelConfig,
  ) {
    Object.assign(this, record);
    this.db = db;
    this.nameGen = nameGenerator;
    this.dockhost = dockhost;
    this.logger = logger;

    const { dockhostContainer, dockhostProject, dockhostImage } = record;

    this.container = new ContainerModel({
      name: dockhostContainer,
      project: dockhostProject,
      image: dockhostImage,
      dockhost: this.dockhost,
      logger,
    });
  }

  public async start() {
    if (this.hardReloading) return null;

    this.logger.info("Starting bot...");

    await this.container.ifExist(null, () =>
      this.container.create({
        clientId: this.getClientId(),
        accessToken: this.accessToken,
        siteOrigin: this.siteOrigin,
        tgBotToken: this.tgBotToken,
      }),
    );

    return this.container.start();
  }

  public async stop() {
    if (this.hardReloading) return null;

    this.logger.info("Stopping bot...");

    return this.container.ifExist(() => this.container.stop());
  }

  public async restart() {
    if (this.hardReloading) return null;

    this.logger.info("Restarting bot...");

    return this.container.ifExist(async () => {
      await this.container.stop();

      return this.container.start();
    });
  }

  public async delete() {
    if (this.hardReloading) return null;

    this.logger.info("Deleting bot...");

    return this.container.ifExist(() => this.container.destroy());
  }

  public async setState(state: "starting" | "stopping" | "deleted") {
    if (this.hardReloading) return null;

    switch (state) {
      case "starting":
        return this.start();
      case "stopping":
        return this.stop();
      case "deleted":
        return this.delete();
      default:
        return null;
    }
  }

  public async setBypassTelemetry(bypassTelemetry: boolean) {
    await this.db
      .knex("bot")
      .update<BotRecord>({ bypassTelemetry })
      .where("id", this.id);

    Reflect.set(this, "bypassTelemetry", bypassTelemetry);

    return this.sheduleHardReload();
  }

  public async setModelId(modelId: number) {
    await this.db
      .knex("bot")
      .update<BotRecord>({ modelId })
      .where("id", this.id);

    Reflect.set(this, "modelId", modelId);

    return this.sheduleHardReload();
  }

  public async setTgBotToken(tgBotToken: string) {
    await this.db
      .knex("bot")
      .update<BotRecord>({ tgBotToken })
      .where("id", this.id);

    Reflect.set(this, "tgBotToken", tgBotToken);

    return this.sheduleHardReload();
  }

  public toJSON() {
    return {
      id: this.externalId,
      state: this.state,
      accountId: this.accountId,
      bypassTelemetry: this.bypassTelemetry,
      modelId: this.modelId,
      dockhostImage: this.dockhostImage,
      dockhostContainer: this.dockhostContainer,
      dockhostProject: this.dockhostProject,
    };
  }

  private getClientId() {
    return BotModel.getClientId(this.id, this.accountId);
  }

  private _hardReloadTimeout?: NodeJS.Timeout;
  private sheduleHardReload() {
    if (this._hardReloadTimeout) {
      clearTimeout(this._hardReloadTimeout);
    }

    setTimeout(() => {
      delete this._hardReloadTimeout;

      this.hardReload();
    }, 3 * 1000);
  }

  private hardReloading = false;
  private async hardReload() {
    try {
      this.hardReloading = true;

      return this.container.ifExist(async () => {
        await this.container.destroy();

        await this.container.create({
          clientId: this.getClientId(),
          accessToken: this.accessToken,
          siteOrigin: this.siteOrigin,
          tgBotToken: this.tgBotToken,
        });

        await this.container.start();
      });
    } catch (error) {
      this.logger.error(error);
    } finally {
      this.hardReloading = false;
    }
  }
}
