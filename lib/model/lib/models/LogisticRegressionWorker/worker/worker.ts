import { parentPort, workerData } from 'node:worker_threads'
import { existsSync } from 'node:fs'
import { LogisticRegression } from '@titorelli/logistic-regression'
import { WorkerServer, HandlerContext } from '../../../../rpc-worker'

export type WorkerData = {
  modelFilename: string
}

const { modelFilename } = workerData as WorkerData

const classifier = new LogisticRegression({ learningRate: 0.01, iterations: 1000 })

if (existsSync(modelFilename)) {
  classifier.loadModel(modelFilename)
} else {
  throw new Error(`Cannot load model bc file "${modelFilename}" doesen\'t exits`)
}

parentPort!.postMessage({ method: 'ready' })

new WorkerServer<WorkerData>(
  parentPort!,
  workerData,
  {
    classify(normalizedText: string) {
      return classifier.classify(normalizedText)
    },

    trainBulk(this: HandlerContext<WorkerData>, docs: string[], labels: number[]) {
      throw new Error('Not implemented yet')

      // classifier.train(docs, labels)

      // classifier.saveModel(this.workerData.modelFilename)
    }
  }
)
