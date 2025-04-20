import { Keymask } from "keymask";

const seedU8A = new TextEncoder().encode(
  atob(process.env.KEYMASK_SEED ?? "DRI="),
);

const keymaskNumber = new Keymask({
  seed: seedU8A.buffer as ArrayBuffer,
  type: "number",
});

export const maskNumber = (value: number) => {
  return keymaskNumber.mask(value);
};

export function unmaskNumber(value: string): number;
export function unmaskNumber(value: undefined | null): null;
export function unmaskNumber(value: string | undefined | null) {
  if (value == null) return null;

  return keymaskNumber.unmask(value);
}
