import { exec } from "node:child_process";
const camelcaseKeysPromise = import("camelcase-keys");
import { DockhostInstaller } from "./DockhostInstaller";

export type ContainerInstanceStatus =
  | "creating"
  | "updating"
  | "ready"
  | "stopped"
  | "paused";

export type ContainerListInstanceItem = {
  id: string;
  cpuUse: number;
  memoryUse: string;
  ip: string;
  receive: string;
  transmit: string;
  isError: boolean;
  errorMsg: string | null;
  restartCount: number;
  status: ContainerInstanceStatus;
};

export type ContainerListResultItem = {
  id: string;
  name: string;
  image: string;
  replicas: number;
  cpuLimit: number;
  memoryLimit: string;
  cpuUse: number;
  memoryUse: string;
  receive: string;
  transmit: string;
  ports: string;
  status: ContainerInstanceStatus;
  instances?: ContainerListInstanceItem[];
};

export class DockhostService {
  private installer = new DockhostInstaller();
  private ready: Promise<void>;

  constructor(private token: string) {
    this.ready = this.initialize();
  }

  public async createContainer({
    name,
    image,
    uid,
    gid,
    replicas,
    cpu,
    cpuFraction,
    memory,
    port,
    init,
    variable = {},
    config = {},
    volume = {},
    project,
  }: {
    name: string;
    image: string;
    uid?: number;
    gid?: number;
    replicas?: number;
    cpu?: number;
    cpuFraction?: 5 | 10 | 20 | 50 | 80 | 100;
    memory?: number;
    port?: number | number[];
    init?: string | string[];
    variable?: Record<string, string>;
    config?: Record<string, string>;
    volume?: Record<string, string>;
    project?: string;
  }) {
    await this.ready;

    const args: string[] = [];

    args.push(`--name ${name}`);
    args.push(`--image ${image}`);

    if (uid) args.push(`--uid ${uid}`);

    if (gid) args.push(`--gid ${gid}`);

    if (replicas != null) args.push(`--replicas ${replicas}`);

    if (cpu != null) args.push(`--cpu ${cpu}`);

    if (cpuFraction != null) args.push(`--cpu-fraction ${cpuFraction}`);

    if (memory) args.push(`--memory ${memory}`);

    if (port) {
      if (Array.isArray(port)) {
        for (const p of port) {
          args.push(`--port ${p}`);
        }
      } else {
        args.push(`--port ${port}`);
      }
    }

    if (init) {
      if (Array.isArray(init)) {
        for (const i of init) {
          args.push(`--init ${i}`);
        }
      } else {
        args.push(`--init ${init}`);
      }
    }

    for (const [name, value] of Object.entries(variable)) {
      args.push(`--variable ${name}:${value}`);
    }

    for (const [name, value] of Object.entries(config)) {
      args.push(`--config ${name}:${value}`);
    }

    for (const [name, value] of Object.entries(volume)) {
      args.push(`--volume ${name}:${value}`);
    }

    if (project) args.push(`--project ${project}`);

    return this.exec(`container create ${args.join(" ")}`);
  }

  public async deleteContainer(project: string, name: string) {
    await this.ready;

    return this.exec(`container delete --name ${name} --project ${project}`);
  }

  public async listContainer(project: string) {
    await this.ready;

    return this.exec<ContainerListResultItem[]>(
      `container list --project ${project} --json`,
      this.parseListOutput,
    );
  }

  private parseListOutput = async (out: string) => {
    const rawJson = JSON.parse(out);
    const { default: camelcaseKeys } = await camelcaseKeysPromise;

    return camelcaseKeys<ContainerListResultItem[]>(rawJson, { deep: true });
  };

  public async startContainer(project: string, name: string) {
    await this.ready;

    return this.exec(`container start ${name} --project ${project}`);
  }

  public async scaleContainer(name: string, replicas: number, project: string) {
    await this.ready;

    return this.exec(
      `container scale ${name} --replicas ${replicas} --project ${project}`,
    );
  }

  public async stopContainer(project: string, name: string) {
    await this.ready;

    return this.exec(`container stop ${name} --project ${project}`);
  }

  public exec(commandWithArgs: string): Promise<string>;
  public exec<T>(
    commandWithArgs: string,
    responseParser: (out: string) => Promise<T>,
  ): T;
  public async exec<T>(
    commandWithArgs: string,
    responseParser?: (out: string) => T | Promise<T>,
  ) {
    return new Promise<T | string>((resolve, reject) => {
      exec(
        `${this.installer.executableFilename} ${commandWithArgs}`,
        {
          encoding: "utf-8",
          shell: "sh",
          env: { DOCKHOST_TOKEN: this.token },
        },
        (error, stdout, stderr) => {
          if (error) {
            return reject(error);
          }

          if (stderr.trim()) {
            return reject(new Error(stderr));
          }

          let result: string | T | Promise<T> = stdout;

          if (responseParser) {
            result = responseParser(stdout);
          } else {
            return resolve(result);
          }

          if (typeof result === "object" && "then" in result) {
            return result.then(resolve, reject);
          } else {
            return resolve(result);
          }
        },
      );
    });
  }

  private async initialize() {
    await this.installer.install();
  }
}
