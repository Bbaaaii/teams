export interface React { reactId: number, uIds: number[], isThisUserReacted: boolean }
export interface MessageId { messageId: number }
export interface SharedMessageId { sharedMessageId: number }
export interface Message { messageId: number, uId: number, message: string, timeSent: number, isPinned: boolean, reacts: React[] }
