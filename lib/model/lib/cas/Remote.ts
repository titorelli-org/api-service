import type { Logger } from "pino";
import type { ICas } from "./types";

export type IsBannedResult = {
  banned: boolean;
};

export class RemoteAntispam implements ICas {
  private baseUrl = process.env.CAS_ORIGIN;

  constructor(private logger: Logger) {}

  async has(tgUserId: number): Promise<boolean> {
    try {
      const url = new URL("/isBanned", this.baseUrl);

      url.searchParams.set("tgUserId", String(tgUserId));

      const resp = await fetch(url);
      const { banned } = (await resp.json()) as Awaited<IsBannedResult>;

      return banned;
    } catch (error) {
      this.logger.error(error);

      return false;
    }
  }

  async add(tgUserId: number): Promise<void> {
    try {
      const url = new URL("/train", this.baseUrl);

      await fetch(url, {
        method: "POST",
        body: JSON.stringify({ tgUserId, banned: true }),
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      this.logger.error(error);
    }
  }

  async remove(tgUserId: number): Promise<void> {
    try {
      const url = new URL("/train", this.baseUrl);

      await fetch(url, {
        method: "POST",
        body: JSON.stringify({ tgUserId, banned: false }),
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      this.logger.error(error);
    }
  }
}
