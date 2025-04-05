import { parentPort, workerData } from 'node:worker_threads'
import { existsSync } from 'node:fs'
import { LogisticRegressionClassifier, PorterStemmerRu } from 'natural'
import { WorkerServer, HandlerContext } from '../../../../rpc-worker'

export type WorkerData = {
  modelFilename: string
}

const { modelFilename } = workerData as WorkerData

let classifier = new LogisticRegressionClassifier(PorterStemmerRu)

if (existsSync(modelFilename)) {
  LogisticRegressionClassifier.load(modelFilename, PorterStemmerRu, (e, c) => {
    if (c) {
      classifier = c

      parentPort!.postMessage({ method: 'ready' })
    }
  })
} else {
  throw new Error(`Cannot load model bc file "${modelFilename}" doesen\'t exits`)
}

new WorkerServer<WorkerData>(
  parentPort!,
  workerData,
  {
    classify(normalizedText: string) {
      const classifications = classifier.getClassifications(normalizedText)

      return classifications[0]
    },

    trainBulk(this: HandlerContext<WorkerData>, docs: string[], labels: number[]) {
      throw new Error('Not implemeted yet')

      //   for (let i = 0; i < docs.length; i++) {
      //     classifier.addDocument(docs[i], labels[i] === 0 ? 'ham' : 'spam')
      //   }


      //   classifier.train()

      //   return new Promise<void>(
      //     (resolve, reject) =>
      //       classifier.save(
      //         this.workerData.modelFilename,
      //         (e) => e ? reject(e) : resolve()
      //       )
      //   )
    }
  }
)
