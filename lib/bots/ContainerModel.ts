import type { Logger } from "pino";
import type { DockhostService } from "./dockhost";

export type ContainerModelConfig = {
  name: string;
  image: string;
  project: string;
  dockhost: DockhostService;
  logger: Logger;
};

export class ContainerModel {
  private readonly name: string;
  private readonly image: string;
  private readonly project: string;
  private readonly dockhost: DockhostService;
  private readonly logger: Logger;

  constructor(config: ContainerModelConfig) {
    Object.assign(this, config);
  }

  public async exist() {
    const containers = await this.dockhost.listContainer(this.project);

    return containers.some(({ name }) => name === this.name);
  }

  public async ifExist(trueCallback?: () => void, falseCallback?: () => void) {
    return (await this.exist()) ? trueCallback?.() : falseCallback?.();
  }

  public async create({
    clientId,
    accessToken,
    siteOrigin,
    tgBotToken,
  }: {
    clientId: string;
    accessToken: string;
    siteOrigin: string;
    tgBotToken: string;
  }) {
    return this.ifExist(
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
            TITORELLI_HOST: siteOrigin,
            BOT_TOKEN: tgBotToken,
          },
        };

        this.logger.info(config, "Creating container with config...");

        await this.dockhost.createContainer(config);
      },
    );
  }

  public async start() {
    return this.ifExist(
      () => this.dockhost.scaleContainer(this.name, 1, this.project),
      () => {
        this.logger.warn("Attempt to start container that not exits");

        return null;
      },
    );
  }

  public async stop() {
    return this.ifExist(
      () => this.dockhost.scaleContainer(this.name, 0, this.project),
      () => {
        this.logger.warn("Attempt to stop container that not exist");

        return null;
      },
    );
  }

  public async destroy() {
    return this.ifExist(
      () => this.dockhost.deleteContainer(this.project, this.name),
      () => {
        this.logger.warn("Attempt to destroy container that not exist");

        return null;
      },
    );
  }
}
