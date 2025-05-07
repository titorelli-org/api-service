import type { FastifyInstance } from "fastify";
import type { Logger } from "pino";
import type { BotsService } from "../../../bots";

export type OauthTokenResult = {
  access_token: string;
  token_type: "Bearer";
  scope: string;
};

export class OauthPlugin {
  public readonly ready: Promise<void>;
  private readonly ouathTokenPath = "/oauth2/token";

  constructor(
    private service: FastifyInstance,
    private oauthClients: ReadonlyArray<{
      id: string;
      secret: string;
      scopes: string[];
    }>,
    private bots: BotsService,
    private logger: Logger,
  ) {
    this.ready = this.initialize();
  }

  private async initialize() {
    await this.installOauthTokenRoute();
  }

  private async installOauthTokenRoute() {
    await this.service.post<{
      Body: {
        grant_type: "client_credentials";
        client_id: string;
        client_secret: string;
        scope: string;
      };
    }>(
      this.ouathTokenPath,
      {
        schema: {
          body: {
            type: "object",
            properties: {
              grant_type: { enum: ["client_credentials"] },
              client_id: { type: "string" },
              client_secret: { type: "string" },
              scope: { type: "string" },
            },
          },
          response: {
            200: {
              type: "object",
              properties: {
                access_token: { type: "string" },
                token_type: { enum: ["Bearer"] },
                expires_id: { type: "number" },
                scope: { type: "string" },
              },
            },
          },
        },
      },
      async ({ body }) => {
        await this.ready;

        let result: OauthTokenResult | null = null;

        try {
          result = await this.legacyTokenHandler(
            body.client_id,
            body.client_secret,
            body.scope,
          );

          return result;
        } catch (e) {
          this.logger.info(
            "Client with id = %s attempted to get token with legacy path, errored: %j",
            body.client_id,
            e,
          );
        }

        return this.modernTokenHandler(
          body.client_id,
          body.client_secret,
          body.scope,
        );
      },
    );
  }

  private async legacyTokenHandler(
    clientId: string,
    clientSecret: string,
    scope: string,
  ) {
    const client = this.oauthClients.find(({ id }) => id === clientId);

    if (!client) {
      throw new Error(
        `Client with id = "${clientId}" not registered within system`,
      );
    }

    if (client.secret !== clientSecret)
      throw new Error("Client credentials not valid");

    const requestScopes =
      scope
        ?.split(" ")
        .map((s) => s.trim())
        .filter((s) => s) ?? [];

    const scopes = requestScopes.filter((s) => client.scopes.includes(s));

    const token = this.service.jwt.sign({
      sub: clientId,
      scopes: scopes,
    });

    return {
      access_token: token,
      token_type: "Bearer",
      expires_id: -1,
      scope: scopes.join(" "),
    } as OauthTokenResult;
  }

  private async modernTokenHandler(
    clientId: string,
    clientSecret: string,
    scope: string,
  ) {
    const requestScopes =
      scope
        ?.split(" ")
        .map((s) => s.trim())
        .filter((s) => s) ?? [];

    const [hasAccess, grantedScopes] = await this.bots.assertIdentity(
      clientId,
      clientSecret,
      requestScopes,
    );

    if (hasAccess) {
      const token = this.service.jwt.sign({
        sub: clientId,
        scopes: scope,
      });

      return {
        access_token: token,
        token_type: "Bearer",
        scope: grantedScopes.join(" "),
      } as OauthTokenResult;
    }

    return null;
  }
}
