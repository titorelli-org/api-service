import fs from 'node:fs'
import { finished } from 'node:stream/promises'
import { parse } from 'csv'
import type { Logger } from 'pino'
import type { ICas } from './types'

export class CasAntispam implements ICas {
  private userIds = new Set<number>
  private ready: Promise<void>

  constructor(
    private modelFilename: string,
    private logger: Logger
  ) {
    this.ready = this.initialize()
  }

  async has(tgUserId: number) {
    await this.ready

    return this.userIds.has(tgUserId)
  }

  /**
   * 
   * @todo Use library for CSV serialization
   */
  async add(tgUserId: number) {
    await this.ready

    await fs.promises.appendFile(this.modelFilename, `${tgUserId}\n`, 'utf-8')
  }

  private async initialize() {
    this.userIds.clear()

    const parser = fs
      .createReadStream(this.modelFilename)
      .pipe(parse())

    parser.on('readable', () => {
      let record: [string]

      while ((record = parser.read()) != null) {
        this.userIds.add(Number(record[0]))
      }
    })

    await finished(parser)
  }
}
