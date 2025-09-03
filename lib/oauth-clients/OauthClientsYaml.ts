import { existsSync, readFileSync } from "node:fs";
import yaml from "yaml";

import type { OauthClients } from "./OauthClients";
import type { OauthClient } from "./types";

export class OauthClientsYaml implements OauthClients {
  public static parseFile(filename: string) {
    const content = existsSync(filename)
      ? readFileSync(filename, "utf-8")
      : null;
    const items = yaml.parse(content);

    return new OauthClientsYaml(items);
  }

  constructor(private readonly items: OauthClient[]) {}

  public list() {
    return this.items;
  }
}
