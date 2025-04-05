import { EventEmitter } from 'node:events'
import type { Logger } from 'pino'

class EndpointQueue extends EventEmitter {
  private pending: RequestInit[] = []

  constructor(
    private url: URL | string,
    private rpsLimit: number,
    private logger: Logger
  ) {
    super()
  }

  push(init: RequestInit) {
    const index = this.pending.length

    this.pending.push(init)

    setTimeout(this.process, this.rpsLimit * 1000 * index, index)

    return index
  }

  awaitResponse(index: number) {
    return new Promise<Response>(resolve => {
      const handler = (eventIndex: number, respPromise: Promise<Response>) => {
        if (index === eventIndex) {
          this.off('response', handler)

          resolve(respPromise)
        }
      }

      this.on('response', handler)
    })
  }

  private process = async (index: number) => {
    const init = this.pending[index]

    const respPromise = fetch(this.url, init)

    this.emit('response', index, respPromise)

    respPromise.finally(() => {
      this.pending.splice(index, 0)
    })
  }
}

export class GptRequestQueue {
  private queues = new Map<string, EndpointQueue>()

  constructor(
    private rpsLimit: number,
    private logger: Logger
  ) { }

  async fetch(url: URL | string, init: RequestInit) {
    let queue = this.queues.get(url.toString())

    if (queue == null) {
      queue = new EndpointQueue(url, this.rpsLimit, this.logger)

      this.queues.set(url.toString(), queue)
    }

    const index = queue.push(init)

    return queue.awaitResponse(index)
  }
}
