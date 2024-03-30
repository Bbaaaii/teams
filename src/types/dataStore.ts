import { User } from './users';
import { Channel } from './channel';
import { Dm } from './dm';
import { UserArchive } from './users';
import { ProfileImage } from './profileImage';

export interface Data {
  users: User[],
  channels: Channel[],
  dms: Dm[],
  profileImages: ProfileImage[],
  reservedMessageIds: number[],
  sessionId: number,
  globalOwners: number[],
  removedUsers: UserArchive[],
  numChannels: number,
  numDms: number,
  numMsgs: number,
  workspaceStats: WorkSpaceStats
}

interface WorkSpaceStats {
  channelsExist: channelsExist[]
  dmsExist: dmsExist[]
  messagesExist: messagesExist[]
}

export interface channelsExist {
  numChannelsExist: number,
  timeStamp: number
}

export interface dmsExist {
  numDmsExist: number,
  timeStamp: number
}

export interface messagesExist {
  numMessagesExist: number,
  timeStamp: number
}