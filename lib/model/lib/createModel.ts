import path from 'node:path'

import { mkdirp } from 'mkdirp'
import replaceExt from 'replace-ext'
import type { Logger } from 'pino'

import { YandexGptModel } from './models/YandexGpt'
import { LogisticRegressionModel } from './models/LogisticRegression'
import { EnsembleModel } from './models/Ensemble'
import { PyModel } from './models/PyModel'
import { CustomRulesModel } from './models/CustomRules'
import { ExactMatchModel, type IModel } from './models'
import { VowpalWabbitModel } from './models/VowpalWabbit'
import type { ModelType } from '../types'

export const createModel = async (
  modelsDirname: string,
  modelType: ModelType,
  modelId: string,
  logger: Logger
): Promise<IModel> => {
  await mkdirp(modelsDirname)

  const modelFilename = path.join(modelsDirname, `${modelType}-${modelId}.json`)

  switch (modelType) {
    case 'yandex-gpt':
      const functionUrl = process.env.YANDEX_FUNCTION_URL

      if (!functionUrl) throw new Error('YANDEX_FUNCTION_URL environment variable must be set')

      return new YandexGptModel(modelId, modelFilename + 'l' /* .jsonl */, functionUrl, logger)

    case 'logistic-regression':
      return new LogisticRegressionModel(modelId, modelFilename, 'ru', logger)

    case 'ensemble':
      return new EnsembleModel(modelId, [
        await createModel(modelsDirname, 'exact-match', modelId, logger),
        await createModel(modelsDirname, 'logistic-regression', modelId, logger)
      ])

    case 'custom-rules':
      return new CustomRulesModel(logger)

    case 'vowpal-wabbit':
      return new VowpalWabbitModel(modelId, replaceExt(modelFilename, '.vw'), logger)

    case 'exact-match':
      return new ExactMatchModel(modelId, replaceExt(modelFilename, '.sqlite3'), logger)

    case 'python-model':
      return new PyModel(logger)

    default:
      throw 'unreachable'
  }
}
