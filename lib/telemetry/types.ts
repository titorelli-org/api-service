import type { ReasonTypes, Labels } from '@titorelli/client'

export type SelfInfo = {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: true;
  addedToAttachmentMenu?: true;
  isBot: true;
  canJoinGroups: boolean;
  canReadAllGroupMessages: boolean;
  supportsInlineQueries: boolean;
}

export type UserInfo = {
  id: number;
  reporterTgBotId: number
  isBot: boolean;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: true;
  addedToAttachmentMenu?: true;
}

export type ChatInfo = {
  id: number
  reporterTgBotId: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  username?: string
  title?: string
  firstName?: string
  lastName?: string
  isForum?: boolean
  description?: string
  bio?: string
}

export type MessageInfo = {
  id: number
  reporterTgBotId: number
  type: 'text' | 'media'
  threadId?: number
  fromTgUserId: number
  senderTgChatId?: number
  date: number
  tgChatId: number
  isTopic?: boolean
  text?: string
  caption?: string
}

export type SelfInfoRecord = {
  id: number;
  tgUserId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: true;
  addedToAttachmentMenu?: true;
  isBot: true;
  canJoinGroups: boolean;
  canReadAllGroupMessages: boolean;
  supportsInlineQueries: boolean;
}

export type MemberInfoRecord = {
  id: number;
  reporterTgBotId: number
  tgUserId: number;
  isBot: boolean;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: true;
  addedToAttachmentMenu?: true;
}

export type ChatInfoRecord = {
  id: number
  reporterTgBotId: number
  tgChatId: number
  type: 'private' | 'group' | 'supergroup' | 'channel'
  username?: string
  title?: string
  firstName?: string
  lastName?: string
  isForum?: boolean
  description?: string
  bio?: string
}

export type MessageInfoRecord = {
  id: number
  reporterTgBotId: number
  tgMessageId: number
  type: 'text' | 'media'
  threadId: number
  fromTgUserId: number
  senderTgChatId: number
  date: number
  tgChatId: number
  isTopic?: boolean
  text?: string
  caption?: string
}

export type PredictionRecord = {
  id: number
  reporterTgBotId: number
  tgMessageId: number
  tgUserId: number
  reason: ReasonTypes
  label: Labels
  confidence: number
}
