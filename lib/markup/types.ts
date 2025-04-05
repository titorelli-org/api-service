export type ExampleRecord = {
  id: number
  tgMessageId: number
  tgChatId: number
  date: number
  text: string
  caption: string
  createdAt: string
}

export type LabelRecord = {
  id: number
  tgMessageId: number
  tgChatId: number
  label: 'spam' | 'ham'
  issuer: string
  createdAt: string
  updatedAt: string
}

export type ChatRecord = {
  id: number
  tgChatId: number
  tgBotId: number
  name: string
  updatedAt: string
  createdAt: string
  latestTgMessageId: number
}

export type MemberRoot =
  & MemberRecord
  & {
    usernames: UsernameRecord[]
    firstNames: FirstnameRecord[]
    lastNames: LastnameRecord[]
  }

export type MemberRecord = {
  id: number
  tgUserId: number
  languageCode: string
  isPremium: boolean
  createdAt: string
  updatedAt: string
}

export type UsernameRecord = {
  id: number
  memberId: number
  createdAt: string
  username: string
}

export type FirstnameRecord = {
  id: number
  memberId: number
  createdAt: string
  firstName: string
}

export type LastnameRecord = {
  id: number
  memberId: number
  createdAt: string
  lastName: string
}
