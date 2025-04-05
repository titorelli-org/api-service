import type { Logger } from 'pino'
import { ICas } from "./types";

export class CascadeAntispam implements ICas {
  constructor(
    private components: ICas[],
    private logger: Logger
  ) { }

  async has(id: number): Promise<boolean> {
    return (await (Promise.all(this.components.map((cas) => cas.has(id))))).some(t => t)
  }

  async add(id: number): Promise<void> {
    for (const cas of this.components) {
      await cas.add(id)
    }
  }
}
