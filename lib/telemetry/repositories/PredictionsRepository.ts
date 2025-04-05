import { Knex } from "knex";
import type { Db } from "../../Db";
import type { PredictionRecord } from "../types";
// import { Prediction } from "@titorelli/client";

export class PredictionsRepository {
  constructor(private db: Db) { }

  private get knex() {
    return this.db.knex as Knex<PredictionRecord, PredictionRecord[]>
  }

  async insert(tgMessageId: number, tgUserId: number, prediction: any, reporterTgBotId: number) {
    await this.knex
      .insert({
        tgMessageId,
        tgUserId,
        reason: prediction.reason,
        label: prediction.value,
        confidence: prediction.confidence,
        reporterTgBotId
      })
      .into('predictions')
  }
}
