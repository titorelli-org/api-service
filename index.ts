import path from "node:path";
import {existsSync} from "node:fs";
import {env} from "./lib/env";
import {createService} from "./lib/createService";

const oauthClientsFilename = path.join(__dirname, "data/oauth-clients.yaml");

if (!existsSync(oauthClientsFilename)) {
    throw new Error("oauth-clients.yaml file must be present in a ./data folder");
}

createService({
    oauthClientsFilename,
    legacyAuth: env.FEAT_LEGACY_AUTH,
    modernAuth: env.FEAT_MODERN_AUTH
}).listen()
