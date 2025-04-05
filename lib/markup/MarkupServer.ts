import path from 'node:path'
import { Db } from "../Db"
import { ChatRepository } from './repositories/ChatRepository'
import { ExampleRepository } from './repositories/ExampleRepository'
import { LabelRepository } from './repositories/LabelRepository'
import { MemberRepository } from './repositories/MemberRepository'

export class MarkupServer {
  private db = new Db(
    process.env.MARKUP_DB_FILENAME ?? path.join(process.cwd(), 'markup.sqlite3'),
    path.join(__dirname, './migrations')
  )
  private chatRepository = new ChatRepository(this.db)
  private exampleRepository = new ExampleRepository(this.db)
  private labelRepository = new LabelRepository(this.db)
  private memberRepository = new MemberRepository(this.db)

  upsertChat(...args: Parameters<ChatRepository['upsert']>) {
    return this.chatRepository.upsert(...args)
  }

  async insertExample(...args: Parameters<ExampleRepository['insert']>) {
    const result = await this.exampleRepository.insert(...args)

    await this.chatRepository.updateLatestMessage(args[0].tgChatId, args[0].tgMessageId)

    return result
  }

  insertLabel(...args: Parameters<LabelRepository['insert']>) {
    return this.labelRepository.insert(...args)
  }

  insertMember(...args: Parameters<MemberRepository['upsert']>) {
    return this.memberRepository.upsert(...args)
  }

  upsertMemberUsername(...args: Parameters<MemberRepository['upsertUsername']>) {
    return this.memberRepository.upsertUsername(...args)
  }

  upsertMemberFirstName(...args: Parameters<MemberRepository['upsertFirstname']>) {
    return this.memberRepository.upsertFirstname(...args)
  }

  upsertMemberLastName(...args: Parameters<MemberRepository['upsertLastname']>) {
    return this.memberRepository.upsertLastname(...args)
  }

  listChatsByBotId(...args: Parameters<ChatRepository['listByBotId']>) {
    return this.chatRepository.listByBotId(...args)
  }

  listExamplesByChatId(...args: Parameters<ExampleRepository['listByChatId']>) {
    return this.exampleRepository.listByChatId(...args)
  }

  listLabelsByMessageIdAndIssuer(...args: Parameters<LabelRepository['listByMessageIdAndIssuer']>) {
    return this.labelRepository.listByMessageIdAndIssuer(...args)
  }

  getMemberByTgUserId(...args: Parameters<MemberRepository['getByTgUserId']>) {
    return this.memberRepository.getByTgUserId(...args)
  }

  getExampleByTgMessageId(...args: Parameters<ExampleRepository['getByTgMessageId']>) {
    return this.exampleRepository.getByTgMessageId(...args)
  }
}
