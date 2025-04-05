import { type MessagePort } from 'node:worker_threads'

export type HandlerContext<WD extends Record<string, unknown>> = {
  workerData: WD
}

export class WorkerServer<WD extends Record<string, unknown>> {
  constructor(
    private parentPort: MessagePort,
    private workerData: WD,
    private methodHandlers: Record<string, Function>
  ) {
    this.parentPort.on('message', async (req: { id: number, method: string, params: any[] }) => {
      const handler = this.getHandler(req.method)

      if (!handler)
        return

      const res = await this.invoke(handler, req)

      this.parentPort.postMessage(res)
    })
  }

  private getHandler(name: string) {
    const fn = this.methodHandlers[name]

    return fn ?? null
  }

  private get handlerContext() {
    return {
      workerData: this.workerData
    } as HandlerContext<WD>
  }

  private async invoke<F extends Function, P extends any[]>(fn: F, req: { id: number, method: string, params: P }) {
    try {
      const result = await fn.apply(this.handlerContext, req.params)

      const res = {
        id: req.id,
        result
      }

      return res
    } catch (error) {
      console.error(error)

      const res = {
        id: req.id,
        error
      }

      return res
    }
  }
}
