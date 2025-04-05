import { ChildProcess } from 'node:child_process'
import spawn from 'cross-spawn'
import { Logger } from 'pino'

import { IModel } from "./IModel";
import { UnlabeledExample, Prediction, LabeledExample } from '../../types';
import path from 'node:path';

export class PyModel implements IModel {
  private process: ChildProcess | null = null;
  private serviceBaseUrl = 'http://127.0.0.1:2999'
  private ready: Promise<void>

  public type = 'python-model' as const

  constructor(
    private logger: Logger
  ) {
    this.ready = this.reinitialize()
  }

  async predict(example: UnlabeledExample): Promise<Prediction | null> {
    await this.ready

    const res = await fetch(`${this.serviceBaseUrl}/predict`, {
      method: 'POST',
      body: JSON.stringify({ text: example.text }),
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!res.ok)
      return null

    const { value, confidence } = await res.json()

    return {
      value,
      confidence,
      reason: 'classifier'
    }
  }

  async train(example: LabeledExample): Promise<void> {

  }

  async trainBulk(examples: LabeledExample[]): Promise<void> {

  }

  onCreated(): void {

  }

  onRemoved(): void {

  }

  private reinitialize = async () => {
    console.log('reinitialize')

    if (this.process) {
      this.process.removeAllListeners()
      this.process.kill()

      this.process = null
    }

    this.process = spawn(
      `sh ${path.join(__dirname, '../../../coach/model-service/run.sh')}`,
      {
        shell: true,
        stdio: 'inherit',
        cwd: path.join(__dirname, '../../../coach/model-service')
      }
    )

    while (true) {
      try {
        await new Promise(resolve => setTimeout(resolve, 700))

        const res = await fetch(`${this.serviceBaseUrl}/probe`)
        const data = await res.json()

        if ('ok' in data && data.ok) {
          break
        }
      } catch (e) {
        console.error(e)

        continue
      }
    }

    this.process.on('exit', this.reinitialize)
    this.process.on('error', this.reinitialize)
  }
}
