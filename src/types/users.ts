export interface Notification { channelId: number, dmId: number, notificationMessage: string }

export interface UserNotifications { notifications: Notification[] }

export interface User {
  uId: number,
  email: string,
  password: string,
  nameFirst: string,
  nameLast: string,
  handleStr: string,
  tokens: string[],
  resetCodes: string[],
  notifications: Notification[],
  userStats: userStats
}

interface userStats {
  channelsJoined: channelStats[],
  dmsJoined: dmStats[],
  messagesSent: messageStats[], 
}

export interface channelStats {
  numChannelsJoined: number,
  timeStamp: number
}

export interface dmStats {
  numDmsJoined: number,
  timeStamp: number
}

export interface messageStats {
  numMessagesSent: number,
  timeStamp: number
}


export interface InnerUserProfile {
  uId: number,
  email: string,
  nameFirst: string,
  nameLast: string,
  handleStr: string,
  profileImgUrl: string
}

export interface UserProfile {
  user: InnerUserProfile
}

export interface Users { users: InnerUserProfile[] }

export type RemovedUserFirstName = 'Removed';
export type RemovedUserLastName = 'user';

export interface UserArchive {
  uId: number,
  nameFirst: RemovedUserFirstName,
  nameLast: RemovedUserLastName,
  handleStr: string,
  email: string,
}

export enum Permission {
  // eslint-disable-next-line no-unused-vars
  OWNER = 1,
  // eslint-disable-next-line no-unused-vars
  MEMBER = 2,
}
