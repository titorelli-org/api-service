export interface ICas {
  has(id: number): Promise<boolean>

  add(id: number): Promise<void>
}
