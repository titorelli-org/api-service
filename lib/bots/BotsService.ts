import path from "node:path";
import { type Logger } from "pino";
import { Db } from "../Db";
import { ContainerListResultItem, DockhostService } from "./dockhost";
import { ContainerNameGenerator } from "./ContainerNameGenerator";
import { BotModel } from "./models";
import { BotRepository } from "./repositories";

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
  private logger: Logger;

  constructor({
    dockhostToken,
    baseDockhostProject,
    baseDockhostContainer,
    baseDockhostImage,
    logger,
  }: // siteOrigin,
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
  }

  public async start() {
    const { makePoller } = await import("reactive-poller");

    if (this.poller == null) {
      this.poller = makePoller<ContainerListResultItem[]>({
        dataProvider: async () =>
          this.dockhost.listContainer(this.baseDockhostProject),
        errorHandler: (error) => this.logger.error(error),
        interval: 1200,
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
    return BotModel.create({
      externalId,
      accessToken,
      bypassTelemetry,
      accountId,
      modelId,
      tgBotToken,
      scopes,
      dockhostImage: this.baseDockhostImage,
      dockhostProject: this.baseDockhostProject,
      nameGenerator: this.nameGenerator,
      dockhost: this.dockhost,
      botRepository: this.botRepository,
      logger: this.logger,
    });
  }

  public async list(accountId: number) {
    const records = await this.db.knex
      .select<Pick<BotRecord, "id">[]>("id")
      .from("bot")
      .where("accountId", accountId);

    return Promise.all(
      records.map(({ id }) =>
        BotModel.getById(id, {
          nameGenerator: this.nameGenerator,
          dockhost: this.dockhost,
          botRepository: this.botRepository,
          logger: this.logger,
        }),
      ),
    );
  }

  public async update({
    id: externalId,
    bypassTelemetry,
    modelId,
    tgBotToken,
    state,
  }: {
    id: number;
    bypassTelemetry?: boolean;
    modelId?: number;
    tgBotToken?: string;
    state?: string;
  }) {
    const bot = await BotModel.getByExternalId(externalId, {
      nameGenerator: this.nameGenerator,
      dockhost: this.dockhost,
      botRepository: this.botRepository,
      logger: this.logger,
    });

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

    if (state != null) {
      await bot.setState(state as any);
    }
  }

  public async get(id: number) {
    return BotModel.getByExternalId(id, {
      nameGenerator: this.nameGenerator,
      dockhost: this.dockhost,
      botRepository: this.botRepository,
      logger: this.logger,
    });
  }

  public async remove(externalId: number) {
    const bot = await BotModel.getByExternalId(externalId, {
      nameGenerator: this.nameGenerator,
      dockhost: this.dockhost,
      botRepository: this.botRepository,
      logger: this.logger,
    });

    if (!bot) return null;

    await bot.delete();
  }

  public async reportAlive(clientId: string) {
    const [botId, accountId] = BotModel.parseClientId(clientId);

    if (!botId || !accountId) return null;

    await this.db
      .knex("bot")
      .update<BotRecord>({ state: "running" })
      .where("id", botId)
      .andWhere("accountId", accountId);

    let t = this.aliveTimeouts.get(botId);

    clearTimeout(t);

    this.aliveTimeouts.set(botId, undefined);

    t = setTimeout(async () => {
      await this.db
        .knex("bot")
        .update<BotRecord>({ state: "failed" })
        .where("id", botId)
        .andWhere("accountId", accountId);
    }, 30 * 1000 /* 30 seconds */);

    this.aliveTimeouts.set(botId, t);
  }

  public async assertIdentity(
    clientId: string,
    clientSecret: string,
    scopes: string[],
  ): Promise<[false] | [true, string[]]> {
    const bot = await BotModel.getByClientId(clientId, {
      nameGenerator: this.nameGenerator,
      dockhost: this.dockhost,
      botRepository: this.botRepository,
      logger: this.logger,
    });

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

  private async markBotAsDeleted(bot: BotRecord) {
    await this.db
      .knex("bot")
      .update<BotRecord>({ state: "deleted" })
      .where("id", bot.id);
  }

  private onPeriodicListResult = async (result: ContainerListResultItem[]) => {
    const bots = await this.db.knex.select<BotRecord[]>("*").from("bot");
    const items = result.filter(({ name }) => this.nameGenerator.match(name));

    for (const bot of bots) {
      const item = items.find(({ name }) => this.nameGenerator.match(name));
      if (item == null) {
        await this.markBotAsDeleted(bot);
      }
    }
  };
}
