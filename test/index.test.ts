import { test, it, beforeEach, afterEach, after } from "node:test";
import { deepEqual } from "node:assert";
import path from "node:path";
import { createService } from "../lib/createService";
import { type Service } from "../lib/Service";
import { createClient, ModelClient } from "@titorelli/client";

import { Loophole } from "./lib";
import pino from "pino";

const createDummyService = async () => {
  const oauthClientsFilename = path.join(
    __dirname,
    "../data/oauth-clients.yaml",
  );
  const jwksFilename = path.join(__dirname, "../data/jwks.json");

  return createService({
    oauthClientsFilename,
    jwksFilename,
    apiOrigin: "https://test-titorelli-api-service.loophole.site",
    legacyAuth: false,
    modernAuth: true,
  });
};

const suiteCommon = async () => {
  let service: Service;
  let tunnel: Loophole;

  await beforeEach(async () => {
    service = await createDummyService();
    tunnel = new Loophole(3000, { hostname: "test-titorelli-api-service" });

    await service.listen();
    await tunnel.start();
  });

  await afterEach(async () => {
    await tunnel.stop();
    await service.terminate();
  });

  // await after(() => {
  //   process.exit(0);
  // });
};

test("text classification api", async () => {
  await suiteCommon();

  let client: ModelClient;

  await beforeEach(async () => {
    client = await createClient(
      "model",
      "https://test-titorelli-api-service.loophole.site/models/generic",
      "--test--",
      pino({ name: "test-logger" }),
    );
  });

  await it("get prediction", async () => {
    console.log("GET PREDICTION");

    const prediction = await client.predict({ text: "Я не бот!" });

    console.log("prediction =", prediction, typeof prediction);

    // const { label } = await client.predict({ text: "Я не бот!" });

    // console.log("PREDICTION RECEIVED", label);

    // deepEqual(label, "spam");
    // deepEqual(label, "ham");
  });
});
