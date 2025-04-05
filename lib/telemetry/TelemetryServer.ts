import path from 'node:path'
import { Db } from "../Db"
import { SelfInfoRepository } from './repositories/SelfInfoRepository'
import { MemberInfoRepository } from './repositories/MemberInfoRepository'
import { ChatInfoRepository } from './repositories/ChatInfoRepository'
import { MessageInfoRepository } from './repositories/MessageInfoRepository'
import { PredictionsRepository } from './repositories/PredictionsRepository'
import type { SelfInfo, UserInfo, ChatInfo, MessageInfo } from "./types"

export class TelemetryServer {
  private db = new Db(
    process.env.TELEMETRY_DB_FILENAME ?? path.join(process.cwd(), 'telemetry.sqlite3'),
    path.join(__dirname, './migrations')
  )
  private selfInfoRepository = new SelfInfoRepository(this.db)
  private memberInfoRepository = new MemberInfoRepository(this.db)
  private chatInfoRepository = new ChatInfoRepository(this.db)
  private messageInfoRepository = new MessageInfoRepository(this.db)
  private predictionsRepository = new PredictionsRepository(this.db)

  async trackSelfBotInfo(botInfo: SelfInfo) {
    await this.selfInfoRepository.insertIfChanged(botInfo)
  }

  async trackMemberInfo(userInfo: UserInfo) {
    await this.memberInfoRepository.insertIfChanged(userInfo)
  }

  async trackChat(chatInfo: ChatInfo) {
    await this.chatInfoRepository.insertIfChanged(chatInfo)
  }

  async trackMessage(messageInfo: MessageInfo) {
    await this.messageInfoRepository.insert(messageInfo)
  }

  async trackPrediction(tgMessageId: number, prediction: any, reporterTgBotId: number) {
    const savedMessage = await this.messageInfoRepository.getByTgMessageId(tgMessageId)

    if (savedMessage) {
      await this.predictionsRepository.insert(tgMessageId, savedMessage.fromTgUserId, prediction, reporterTgBotId)
    }
  }
}
