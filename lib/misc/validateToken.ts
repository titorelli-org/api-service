import { createSecretKey } from "crypto";
import { env } from "../env";

const secretKey = createSecretKey(env.JWT_SECRET, "utf-8");

export const validateToken = async (tokenStr: string) => {
  const { jwtVerify } = await import("jose");

  try {
    await jwtVerify(tokenStr, secretKey);

    return true;
  } catch (_e) {
    return false;
  }
};
