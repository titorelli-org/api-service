import type { Logger } from "pino";
import {
  serviceDiscovery,
  createClient,
  type CasClient,
} from "@titorelli/client";
import type { ICas } from "./types";
import { env } from "../../../env";

export type IsBannedResult = {
  banned: boolean;
};

export class RemoteAntispam implements ICas {
  private baseUrl = process.env.CAS_ORIGIN;

  constructor(private logger: Logger) {}

  async has(tgUserId: number): Promise<boolean> {
    const cas = await this.getCasClient();

    const { banned } = await cas.isBanned(tgUserId);

    return banned;
  }

  async add(tgUserId: number): Promise<void> {
    const cas = await this.getCasClient();

    return cas.ban(tgUserId);
  }

  async remove(tgUserId: number): Promise<void> {
    const cas = await this.getCasClient();

    return cas.protect(tgUserId);
  }

  private _casClient: CasClient | null = null;
  private async getCasClient() {
    if (this._casClient) return this._casClient;

    const { casOrigin } = await serviceDiscovery(env.SITE_ORIGIN);

    const cas = await createClient("cas", casOrigin, "api");

    this._casClient = cas;

    return cas;
  }
}
