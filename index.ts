import path from 'node:path'
import { readFileSync, existsSync } from 'node:fs'
import yaml from 'yaml'
import pino from 'pino'
import {
  CasAntispam,
  CascadeAntispam,
  createModel,
  LolsAntispam,
  TemporaryStorage,
  Totems,
  type ITotems
} from './lib/model'
import { Service } from './lib/Service'
import { TelemetryServer } from './lib/telemetry/TelemetryServer' //'./lib/telemetry/TelemetryServer'
import { MarkupServer } from './lib/markup/MarkupServer' // './lib/markup/MarkupServer'
import { BotsService } from './lib/bots/BotsService' // './lib/bots'

const oauthClientsFilename = path.join(__dirname, 'oauth-clients.yaml')

if (!existsSync(oauthClientsFilename)) {
  throw new Error('oauth-clients.yaml file must be present in a root of module')
}

const logger = pino()

new Service({
  port: Number(process.env['PORT'] ?? 3000),
  host: process.env['HOST'] ?? '0.0.0.0',
  logger,
  modelsStore: new TemporaryStorage(
    (modelId: string) =>
      createModel(path.join(__dirname, 'data'), 'ensemble', modelId, logger),
    3600000 /* 3 hours */,
    logger
  ),
  cas: new CascadeAntispam([
    new CasAntispam(path.join(__dirname, 'data/cas.csv'), logger),
    new LolsAntispam(path.join(__dirname, 'data/lols.sqlite3'), logger)
  ], logger),
  totemsStore: new TemporaryStorage<ITotems, [string]>(
    (modelId: string) =>
      new Totems(path.join(__dirname, 'data'), modelId, logger),
    3600000 /* 3 hours */,
    logger,
  ),
  jwtSecret: process.env.JWT_SECRET!,
  oauthClients: yaml.parse(readFileSync(oauthClientsFilename, 'utf-8')),
  telemetry: new TelemetryServer(),
  markup: new MarkupServer(),
  bots: new BotsService({
    dockhostToken: process.env.DOCKHOST_TOKEN!,
    baseDockhostProject: 'titorelli-org',
    baseDockhostImage: 'ghcr.io/ychebotaev/titus-bot',
    baseDockhostContainer: 'titus-bot',
    logger
  })
}).listen()
