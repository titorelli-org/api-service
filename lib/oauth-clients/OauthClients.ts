import type { OauthClient } from "./types";

export interface OauthClients {
  list(): OauthClient[];
}
