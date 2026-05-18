import type { Context } from 'grammy'
import type { ConversationFlavor, Conversation } from '@grammyjs/conversations'
import type { User } from '@prisma/client'

// Set by the loadUser middleware (present for all handlers after it).
export interface UserState {
  dbUser: User
}

export type BotContext = Context & ConversationFlavor & UserState

// Inside a conversation, the outer context is the plain conversational ctx.
export type BotConversation = Conversation<BotContext>
