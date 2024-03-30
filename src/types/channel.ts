import { Message } from './message';
import { Standup } from './standup';
import { InnerUserProfile } from './users';

export interface ChannelMember { uId: number }
export interface Channel {
  name: string,
  channelId: number,
  isPublic: boolean,
  ownerMembers: ChannelMember[],
  allMembers: ChannelMember[],
  messages: Message[],
  standup: Standup
}

export interface MessagesReturn {
  messages: Message[],
  start: number,
  end: number
}

export interface ChannelDetails {
  name: string,
  isPublic: boolean,
  ownerMembers: InnerUserProfile[],
  allMembers: InnerUserProfile[]
}

export interface ChannelId { channelId: number }
export interface ChannelListItem { channelId: number, name: string }
export interface ChannelsListView { channels: ChannelListItem[] }
