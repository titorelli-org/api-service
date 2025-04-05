import path from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { mkdirpSync } from "mkdirp";

export class DockhostInstaller {
  private downloadDir = path.join(__dirname, "downloads");
  public executableFilename: string;

  constructor() {
    this.executableFilename = path.join(
      this.downloadDir,
      this.getDockhostTarget(),
    );
  }

  public async install() {
    if (existsSync(this.executableFilename)) return true;

    mkdirpSync(this.downloadDir);

    await this.downloadDockhostCli();
  }

  private async downloadDockhostCli() {
    const target = this.getDockhostTarget();

    if (target == null) return null;

    execSync(
      `curl --fail --location --output "${this.executableFilename}.zip" "https://download.dockhost.ru/cli/releases/master/${target}.zip"`,
    );

    execSync(`unzip -oq ${this.executableFilename}.zip -d ${this.downloadDir}`);
  }

  private getDockhostTarget() {
    switch (`${process.platform}:${process.arch}`) {
      case "darwin:arm64":
        return "dockhost_aarch64-apple-darwin";
      case "linux:x64":
        return "dockhost_x86_64-linux";
      case "linux:arm64":
        return "dockhost_aarch64-linux";
      default:
        return null;
    }
  }
}
