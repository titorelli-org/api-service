import type { Logger } from "pino";
import type { ContainerNameGenerator } from "./ContainerNameGenerator";
import type { DockhostService } from "./dockhost";
import type { BotRepository } from "./repositories";
import { BotModel } from "./models";

export class BotFactory {
  constructor(
    private params: {
      nameGenerator: ContainerNameGenerator;
      dockhost: DockhostService;
      botRepository: BotRepository;
      dockhostImage: string;
      dockhostProject: string;
      logger: Logger;
    },
  ) {}

  public async create(
    param1: Omit<
      Parameters<(typeof BotModel)["create"]>[0],
      keyof typeof this.params
    >,
  ) {
    return BotModel.create({
      ...param1,
      ...this.params,
    });
  }

  public async getBotById(id: number) {
    return BotModel.getBotById(id, this.params);
  }

  public async getByExternalId(externalId: number) {
    return BotModel.getByExternalId(externalId, this.params);
  }

  public async getByClientId(clientId: string) {
    return BotModel.getByClientId(clientId, this.params);
  }
}
