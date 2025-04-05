import path from "node:path";
import { WorkerClient } from "../../../rpc-worker";
import { LabeledExample } from "../../../types";

export class LogisticRegressionWorker extends WorkerClient<{ modelFilename: string }> {
  get workerPath() {
    return path.join(__dirname, 'worker/worker.ts')
  }

  classify(originalText: string) {
    return this.invoke<number, [string]>('classify', originalText)
  }

  trainBulk(examples: LabeledExample[]) {
    throw new Error('Not implemented yet')
    // return this.invoke<void, [typeof examples]>('trainBulk', examples)
  }
}
