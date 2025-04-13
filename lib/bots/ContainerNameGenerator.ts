export class ContainerNameGenerator {
  private re: RegExp

  constructor(private prefix: string, private suffix?: string) {
    if (this.suffix) {
      this.re = new RegExp(`${this.prefix}-\\d+-\\d+-${this.suffix}`)
    } else {
      this.re = new RegExp(`${this.prefix}-\\d+-\\d+`)
    }
  }

  generate(accountId: number, externalId: number) {
    return [`${this.prefix}-${accountId}-${externalId}`, this.suffix].filter(Boolean).join('-')
  }

  match(name: string) {
    return this.re.test(name)
  }
}
