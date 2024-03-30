import { Message } from './message';
import { InnerUserProfile } from './users';

export interface Dm {
  dmId: number,
  name: string,
  members: number[],
  owner: number,
  messages: Message[]
}

export interface DmListItem {
  dmId: number;
  name: string;
}

export interface DmCreateObject {
  dmId: number;
}

export interface DmListView {
  dms: DmListItem[]
}

export interface DmMessagesReturn {
  messages: Message[],
  start: number,
  end: number
}

// export type User = { uId: number, handleStr: string, email: string, nameFirst: string, nameLast: string, profileImgUrl: string };
export interface DmDetails {
  name: string,
  members: InnerUserProfile[]
}
