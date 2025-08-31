import path from "node:path";
import { type Logger } from "pino";
import { Db } from "../Db";
import { DockhostService, type ContainerListResultItem } from "./dockhost";
import { ContainerNameGenerator } from "./ContainerNameGenerator";
import { BotModel } from "./models";
import { BotRepository } from "./repositories";
import { BotFactory } from "./BotFactory";

export type BotRecord = {
  id: number;
  externalId: number;
  accountId: number;
  accessToken: string;
  bypassTelemetry: boolean;
  modelId: number;
  tgBotToken: string;
  dockhostImage: string;
  dockhostContainer: string;
  dockhostProject: string;
  state:
    | "created"
    | "starting"
    | "running"
    | "stopping"
    | "stopped"
    | "failed"
    | "deleted";
  scopes: string;
};

export class BotsService {
  private dockhost: DockhostService;
  private baseDockhostProject: string;
  private baseDockhostContainer: string;
  private baseDockhostImage: string;
  private nameGenerator: ContainerNameGenerator;
  private db = new Db(
    path.join(process.cwd(), "/data/bots.sqlite3"),
    path.join(__dirname, "/migrations"),
  );
  private botRepository: BotRepository;
  private poller: any;
  private aliveTimeouts = new Map<number, NodeJS.Timeout | undefined>();
  private periodicListResultUnsubscribe?: Function;
  private botFactory: BotFactory;
  private logger: Logger;

  constructor({
    dockhostToken,
    baseDockhostProject,
    baseDockhostContainer,
    baseDockhostImage,
    logger,
  }:
  {
    dockhostToken: string;
    baseDockhostProject: string;
    baseDockhostContainer: string;
    baseDockhostImage: string;
    logger: Logger;
    siteOrigin?: string;
  }) {
    this.baseDockhostProject = baseDockhostProject;
    this.baseDockhostContainer = baseDockhostContainer;
    this.baseDockhostImage = baseDockhostImage;
    this.dockhost = new DockhostService(dockhostToken);
    this.nameGenerator = new ContainerNameGenerator(
      this.baseDockhostContainer,
      "next",
    );
    this.logger = logger;
    this.botRepository = new BotRepository(this.db, this.logger);
    this.botFactory = new BotFactory({
      dockhostProject: this.baseDockhostProject,
      dockhostImage: this.baseDockhostImage,
      nameGenerator: this.nameGenerator,
      dockhost: this.dockhost,
      botRepository: this.botRepository,
      logger: this.logger,
    });
  }

  public async start() {
    const { makePoller } = await import("reactive-poller");

    if (this.poller == null) {
      this.poller = makePoller<ContainerListResultItem[]>({
        dataProvider: async () =>
          this.dockhost.listContainer(this.baseDockhostProject),
        errorHandler: (error) => this.logger.error(error),
        interval: 3 * 1000 /* 3 seconds */,
      });
    }

    const unsubscribe = this.poller.onData$.subscribe(
      this.onPeriodicListResult,
    );

    this.periodicListResultUnsubscribe = unsubscribe;

    await this.poller.start();
  }

  public async stop() {
    this.periodicListResultUnsubscribe?.();

    await this.poller.stop();
  }

  public async create({
    id: externalId,
    accessToken,
    bypassTelemetry,
    accountId,
    modelId,
    tgBotToken,
    scopes,
  }: {
    id: number;
    accessToken: string;
    bypassTelemetry: boolean;
    accountId: number;
    modelId: number;
    tgBotToken: string;
    scopes: string;
  }) {
    return this.botFactory.create({
      externalId,
      accessToken,
      bypassTelemetry,
      accountId,
      modelId,
      tgBotToken,
      scopes,
    });
  }

  public async list(accountId: number) {
    const records = await this.db.knex
      .select<Pick<BotRecord, "id">[]>("id")
      .from("bot")
      .where("accountId", accountId);

    return Promise.all(records.map(({ id }) => this.botFactory.getBotById(id)));
  }

  public async update({
    id: externalId,
    bypassTelemetry,
    modelId,
    tgBotToken,
    accessToken,
    state,
  }: {
    id: number;
    bypassTelemetry?: boolean;
    modelId?: number;
    tgBotToken?: string;
    accessToken?: string;
    state?: string;
  }) {
    const bot = await this.botFactory.getByExternalId(externalId);

    if (!bot) throw new Error(`Bot with id = ${externalId} not found`);

    if (bypassTelemetry != null) {
      await bot.setBypassTelemetry(bypassTelemetry);
    }

    if (modelId != null) {
      await bot.setModelId(modelId);
    }

    if (tgBotToken != null) {
      await bot.setTgBotToken(tgBotToken);
    }

    if (accessToken != null) {
      await bot.setAccessToken(accessToken);
    }

    if (state != null) {
      if (state === "stopping" || state === "deleted") {
        this.stopLiveness(bot.id);
      }

      await bot.setState(state as any);
    }
  }

  public async get(externalId: number) {
    return this.botFactory.getByExternalId(externalId);
  }

  public async listByAccessToken(accessToken: string) {
    const bots = await this.botRepository.getAllWithAccessToken(accessToken);

    return bots.map((bot) => BotModel.prototype.toJSON.call(bot));
  }

  public async remove(externalId: number) {
    const bot = await this.botFactory.getByExternalId(externalId);

    if (!bot) return null;

    await bot.delete();
  }

  public async truncateDb() {
    await this.db.knex("bot").truncate();
  }

  public async reportAlive(clientId: string) {
    const [botId, accountId] = BotModel.parseClientId(clientId);

    if (!botId || !accountId) return null;

    await this.db
      .knex("bot")
      .update<BotRecord>({ state: "running" })
      .where("id", botId)
      .andWhere("accountId", accountId);

    this.stopLiveness(botId);

    const t = setTimeout(async () => {
      await this.db
        .knex("bot")
        .update<BotRecord>({ state: "failed" })
        .where("id", botId)
        .andWhere("accountId", accountId);
    }, 30 * 1000 /* 30 seconds */);

    this.aliveTimeouts.set(botId, t);
  }

  public stopLiveness(botId: number) {
    const t = this.aliveTimeouts.get(botId);

    if (!t) return;

    clearTimeout(t);

    this.aliveTimeouts.delete(botId);
  }

  public async assertIdentity(
    clientId: string,
    clientSecret: string,
    scopes: string[],
  ): Promise<[false] | [true, string[]]> {
    const bot = await this.botFactory.getByClientId(clientId);

    if (!bot) return [false];

    if (clientSecret !== bot.accessToken) return [false];

    const botScopes = bot.scopes
      .trim()
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const grantedScopes = scopes.filter((scope) => botScopes.includes(scope));

    return [true, grantedScopes];
  }

  private async markBotAsDeleted(botId: number) {
    await this.db
      .knex("bot")
      .update<BotRecord>({ state: "deleted" })
      .where("id", botId);
  }

  private async markBotAsStopped(botId: number) {
    await this.db
      .knex("bot")
      .update<BotRecord>({ state: "stopped" })
      .where("id", botId);
  }

  private async checkIfBotStopped(botId: number) {
    const bot = await this.botFactory.getBotById(botId);
    const containerStatus = await bot.getContainerStatus();

    if (containerStatus === "paused" || containerStatus === "stopped") {
      await this.markBotAsStopped(botId);
    }
  }

  private onPeriodicListResult = async (result: ContainerListResultItem[]) => {
    const bots = await this.db.knex.select<BotRecord[]>("*").from("bot");
    const filteredItems = result.filter(({ name }) =>
      this.nameGenerator.match(name),
    );

    for (const bot of bots) {
      if (["created", "starting"].includes(bot.state)) continue;

      const exists = filteredItems.some(
        ({ name }) => name === bot.dockhostContainer,
      );

      if (exists) {
        if (["running", "stopping"].includes(bot.state)) {
          await this.checkIfBotStopped(bot.id);
        }
      } else {
        await this.markBotAsDeleted(bot.id);
      }
    }
  };
}
