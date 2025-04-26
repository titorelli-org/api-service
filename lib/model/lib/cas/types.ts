export interface ICas {
  has(id: number): Promise<boolean>;

  add(id: number): Promise<void>;

  remove(id: number): Promise<void>;
}
