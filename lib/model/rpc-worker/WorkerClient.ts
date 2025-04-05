import { Worker } from 'node:worker_threads'

export abstract class WorkerClient<WD extends Record<string, unknown>> {
  private idSeq = 0
  private impl: Worker | null = null
  private ready: Promise<void>

  constructor(private workerData: WD) {
    this.ready = this.reinintialize()
  }

  protected abstract get workerPath(): string

  protected async invoke<R, P extends unknown[]>(name: string, ...params: P) {
    await this.ready

    const req = this.createRequest(name, ...params)

    return this.awaitResponse<R>(req)
  }

  private reinintialize = async () => {
    await this.destroy()

    this.impl = new Worker(
      this.workerPath,
      {
        workerData: this.workerData,
        execArgv: ['-r', 'ts-node/register/transpile-only']
      }
    )

    this.impl.on('error', console.error.bind(console, "Worker error:"))
    this.impl.on('error', this.exceptionHandler)
    this.impl.on('exit', this.exceptionHandler)

    return this.awaitEvent('ready')
  }

  private async awaitResponse<R>(req: ReturnType<typeof this.createRequest>) {
    return new Promise<R>((resolve, reject) => {
      const handler = (res: { id: number, result: R, error: any }) => {
        if (res.id !== req.id)
          return

        if (res.error) {
          reject(res.error)
        } else {
          resolve(res.result)
        }

        this.impl?.removeListener('message', handler)
      }

      this.impl?.addListener('message', handler)

      this.impl?.postMessage(req)
    })
  }

  private async awaitEvent<R = void>(eventName: string) {
    return new Promise<R>(resolve => {
      const handler = (evt: { method: string, result?: any }) => {
        if (evt.method !== eventName)
          return

        console.log('Worker ready: ', this.workerPath)

        resolve(evt.result)

        this.impl!.removeListener('message', handler)
      }

      this.impl!.addListener('message', handler)
    })
  }

  private async destroy() {
    if (this.impl) {
      this.impl.removeAllListeners()
      this.impl.unref()
      await this.impl.terminate()

      this.impl = null
    }
  }

  private exceptionHandler = () => {
    this.ready = this.reinintialize()
  }

  private createRequest<Ps extends unknown[]>(method: string, ...params: Ps) {
    return {
      id: this.idSeq++,
      method,
      params
    }
  }
}
