import type { Logger } from "pino";
import { env } from "../../env";
import { BotContainerModel } from "./BotContainerModel";
import type { BotRecord } from "../BotsService";
import type { ContainerNameGenerator } from "../ContainerNameGenerator";
import type { DockhostService } from "../dockhost";
import type { BotRepository } from "../repositories";
import { maskNumber, unmaskNumber } from "../../keymask";

export type BotModelConfig = {
  nameGenerator: ContainerNameGenerator;
  dockhost: DockhostService;
  botRepository: BotRepository;
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

  private readonly botRepository: BotRepository;
  private readonly nameGen: ContainerNameGenerator;
  private readonly dockhost: DockhostService;
  private readonly container?: BotContainerModel;
  private readonly logger: Logger;
  private readonly siteOrigin = env.SITE_ORIGIN;
  private readonly apiOrigin = env.API_ORIGIN;
  private readonly casOrigin = env.CAS_ORIGIN;
  private readonly telemetryOrigin = env.TELEMETRY_ORIGIN;

  public static getClientId(id: number, accountId: number) {
    return btoa([id, accountId].map((v) => maskNumber(v)).join(":"));
  }

  public static parseClientId(clientId: string) {
    return atob(clientId)
      .split(":")
      .map((s) => unmaskNumber(s));
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
    nameGenerator,
    dockhost,
    botRepository,
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
    nameGenerator: ContainerNameGenerator;
    dockhost: DockhostService;
    botRepository: BotRepository;
    logger: Logger;
  }) {
    const dockhostContainer = nameGenerator.generate(accountId, externalId);

    const id = await botRepository.create({
      externalId,
      accessToken,
      bypassTelemetry,
      accountId,
      modelId,
      tgBotToken,
      dockhostImage,
      dockhostContainer,
      dockhostProject,
      scopes,
    });

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
        nameGenerator,
        dockhost,
        botRepository,
        logger,
      },
    );
  }

  public static async getBotById(id: number, config: BotModelConfig) {
    const record = await config.botRepository.getById(id);

    return record ? new BotModel(record, config) : null;
  }

  public static async getByExternalId(
    externalId: number,
    config: BotModelConfig,
  ) {
    const record = await config.botRepository.getByExternalId(externalId);

    return record ? new BotModel(record, config) : null;
  }

  public static async getByClientId(clientId: string, config: BotModelConfig) {
    const [id] = atob(clientId)
      .split(":")
      .map((s) => unmaskNumber(s));

    return this.getBotById(id, config);
  }

  constructor(record: BotRecord, config: BotModelConfig) {
    Object.assign(this, record);
    Object.assign(this, config);

    const { dockhostContainer, dockhostProject, dockhostImage } = record;

    this.container = new BotContainerModel({
      name: dockhostContainer,
      project: dockhostProject,
      image: dockhostImage,
      dockhost: this.dockhost,
      logger: this.logger,
    });
  }

  public async start() {
    if (this._hardReloading) return null;

    this.logger.info("Starting bot...");

    Reflect.set(this, "state", "starting");

    await this.container.create({
      clientId: this.getClientId(),
      accessToken: this.accessToken,
      apiOrigin: this.apiOrigin,
      casOrigin: this.casOrigin,
      telemetryOrigin: this.telemetryOrigin,
      tgBotToken: this.tgBotToken,
    });

    await this.botRepository.setStateById(this.id, "starting");

    return this.container.start();
  }

  public async stop() {
    if (this._hardReloading) return null;

    this.logger.info("Stopping bot...");

    Reflect.set(this, "state", "stopping");

    await this.botRepository.setStateById(this.id, "stopping");

    return this.container.stop();
  }

  public async restart() {
    if (this._hardReloading) return null;

    this.logger.info("Restarting bot...");

    await this.stop();
    await this.start();
  }

  public async delete() {
    if (this._hardReloading) return null;

    this.logger.info("Deleting bot...");

    await this.botRepository.removeById(this.id);

    return this.container.destroy();
  }

  public async setState(state: "starting" | "stopping" | "deleted") {
    if (this._hardReloading) return null;

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
    await this.botRepository.updateById(this.id, { bypassTelemetry });

    Reflect.set(this, "bypassTelemetry", bypassTelemetry);

    return this.sheduleHardReload();
  }

  public async setModelId(modelId: number) {
    await this.botRepository.updateById(this.id, { modelId });

    Reflect.set(this, "modelId", modelId);

    return this.sheduleHardReload();
  }

  public async setTgBotToken(tgBotToken: string) {
    await this.botRepository.updateById(this.id, { tgBotToken });

    Reflect.set(this, "tgBotToken", tgBotToken);

    return this.sheduleHardReload();
  }

  public async setAccessToken(accessToken: string) {
    await this.botRepository.updateById(this.id, { accessToken });

    Reflect.set(this, "accessToken", accessToken);

    return this.sheduleHardReload();
  }

  public async getContainerStatus() {
    return this.container.getContainerStatus();
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

  private _hardReloading = false;
  private async hardReload() {
    if (this._hardReloading) return null;

    try {
      this._hardReloading = true;

      return this.container.ifExists(async () => {
        await this.container.destroy();

        await this.container.create({
          clientId: this.getClientId(),
          accessToken: this.accessToken,
          apiOrigin: this.siteOrigin,
          casOrigin: this.casOrigin,
          telemetryOrigin: this.telemetryOrigin,
          tgBotToken: this.tgBotToken,
        });

        await this.container.start();
      });
    } catch (error) {
      this.logger.error(error);
    } finally {
      this._hardReloading = false;
    }
  }
}
