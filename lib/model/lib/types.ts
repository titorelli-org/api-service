export interface ITotems {
  has(tgUserId: number): Promise<boolean>

  add(tgUserId: number): Promise<void>

  revoke(tgUserId: number): Promise<void>

  onCreated(): void

  onRemoved(): void
}
