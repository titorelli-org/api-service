import type { Logger } from 'pino'

export type HolderValueBase = {
  onRemoved(): void
  onCreated(): void
}

class ValueHolder<V extends HolderValueBase, Args extends any[]> {
  private timeout: NodeJS.Timeout | undefined
  private value: V | undefined

  constructor(
    private valueFactory: (...args: Args) => V | Promise<V>,
    private timeoutMs: number,
    private logger: Logger,
  ) {
    this.restartTimeout()
  }

  async get(...args: Args) {
    let value = this.value

    if (!value) {
      value = await this.valueFactory(...args)

      value.onCreated()

      this.value = value
    }

    this.restartTimeout()

    return value
  }

  private restartTimeout() {
    clearTimeout(this.timeout)

    this.timeout = setTimeout(this.onTimeout, this.timeoutMs)
  }

  private onTimeout = () => {
    this.value?.onRemoved()

    delete this.value
  }
}

export class TemporaryStorage<V extends HolderValueBase, Args extends any[]> {
  private internal = new Map<string, ValueHolder<V, Args>>()

  constructor(
    private valueFactory: (...args: Args) => V | Promise<V>,
    private storeTimeoutMs: number,
    private logger: Logger
  ) { }

  async getOrCreate(...args: Args) {
    let holder = this.get(...args)

    if (!holder) {
      holder = new ValueHolder<V, Args>(
        this.valueFactory,
        this.storeTimeoutMs,
        this.logger
      )

      this.set(holder, ...args)
    }

    return holder.get(...args)
  }

  private get(...args: Args) {
    return this.internal.get(this.createKey(...args))
  }

  private set(holder: ValueHolder<V, Args>, ...args: Args) {
    return this.internal.set(this.createKey(...args), holder)
  }

  private createKey(...args: Args) {
    return args.join('-')
  }
}
