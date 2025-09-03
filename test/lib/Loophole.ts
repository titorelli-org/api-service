import { exec, ChildProcess } from "node:child_process";
import { debounce } from "lodash";
import { awaitTimeout } from "../../lib/misc";

export class Loophole {
  private readonly hostname?: string;
  private process: ChildProcess;

  constructor(
    private readonly port: number,
    {
      hostname,
    }: {
      hostname?: string;
    } = {},
  ) {
    this.hostname = hostname;
  }

  async start(): Promise<this> {
    const hostnameArg = this.hostname ? `--hostname ${this.hostname}` : "";

    this.process = exec(`loophole http ${this.port} ${hostnameArg}`, {
      shell: "zsh",
    });

    return new Promise((resolve) => {
      const onData = debounce(() => {
        awaitTimeout(2000).then(() => resolve(this));
      }, 1000);

      this.process.stdout.on("data", onData);
    });
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }
}
