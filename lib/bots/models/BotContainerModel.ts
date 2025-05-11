import type { Logger } from "pino";
import { ContainerInstanceStatus, type DockhostService } from "../dockhost";

export type BotContainerModelConfig = {
  name: string;
  image: string;
  project: string;
  dockhost: DockhostService;
  logger: Logger;
};

export class BotContainerModel {
  private readonly name: string;
  private readonly image: string;
  private readonly project: string;
  private readonly dockhost: DockhostService;
  private readonly logger: Logger;

  constructor(config: BotContainerModelConfig) {
    Object.assign(this, config);
  }

  public async exists() {
    const containers = await this.dockhost.listContainer(this.project);

    return containers.some(({ name }) => name === this.name);
  }

  public async ifExists<TR, FR>(
    trueCallback?: () => Promise<TR>,
    falseCallback?: () => Promise<FR>,
  ) {
    return (await this.exists()) ? trueCallback?.() : falseCallback?.();
  }

  public async create({
    clientId,
    accessToken,
    apiOrigin,
    casOrigin,
    telemetryOrigin,
    tgBotToken,
  }: {
    clientId: string;
    accessToken: string;
    apiOrigin: string;
    casOrigin: string;
    telemetryOrigin: string;
    tgBotToken: string;
  }) {
    return this.ifExists(
      () => {
        this.logger.warn(
          "Container creation attempt when container already exists",
        );

        return null;
      },
      async () => {
        const config = {
          replicas: 0,
          project: this.project,
          name: this.name,
          image: this.image,
          variable: {
            TITORELLI_CLIENT_ID: clientId,
            TITORELLI_ACCESS_TOKEN: accessToken,
            TITORELLI_HOST: apiOrigin,
            CAS_ORIGIN: casOrigin,
            TELEMETRY_ORIGIN: telemetryOrigin,
            BOT_TOKEN: tgBotToken,
          },
        };

        this.logger.info(config, "Creating container with config...");

        await this.dockhost.createContainer(config);
      },
    );
  }

  public async start() {
    return this.ifExists(
      () => this.dockhost.scaleContainer(this.name, 1, this.project),
      () => {
        this.logger.warn("Attempt to start container that not exits");

        return null;
      },
    );
  }

  public async stop() {
    return this.ifExists(
      () => this.dockhost.scaleContainer(this.name, 0, this.project),
      () => {
        this.logger.warn("Attempt to stop container that not exist");

        return null;
      },
    );
  }

  public async destroy() {
    return this.ifExists(
      () => this.dockhost.deleteContainer(this.project, this.name),
      () => {
        this.logger.warn("Attempt to destroy container that not exist");

        return null;
      },
    );
  }

  public async getContainerStatus() {
    return this.ifExists<ContainerInstanceStatus, null>(
      async () => {
        const listItems = await this.dockhost.listContainer(this.project);
        const item = listItems.find(({ name }) => this.name === name);

        if (!item) return null;

        return item.status;
      },
      () => {
        this.logger.warn("Attempt to get state of non-existing container");

        return null;
      },
    );
  }
}
