import { setData, getData } from './dataStore';
import { getUserFromToken } from './helper';
import { Empty } from './types/other';
import { Notification, UserNotifications } from './types/users';
import { FORBIDDEN } from './httpsConsts';
import HTTPError from 'http-errors';

const LIMIT = 20;
const MS = 1000;
/**
 * Resets the data object to a default (empty value).
 * Takes no arguments, returns an empty object.
 * No error cases.
 * @returns { }
 */

export function clearV1(): Empty {
  const data = getData();
  setData({
    users: [],
    channels: [],
    dms: [],
    profileImages: [],
    reservedMessageIds: [],
    sessionId: data.sessionId + 1,
    globalOwners: [],
    removedUsers: [],
    numChannels: 0,
    numDms: 0,
    numMsgs: 0,
    workspaceStats: {
      channelsExist: [{ numChannelsExist: 0, timeStamp: Math.floor((new Date()).getTime() / MS) }],
      dmsExist: [{ numDmsExist: 0, timeStamp: Math.floor((new Date()).getTime() / MS) }],
      messagesExist: [{ numMessagesExist: 0, timeStamp: Math.floor((new Date()).getTime() / MS) }]
    }
  });
  return {};
}

/**
 * Function returns user's 20 most recent notifications.
 * @param {string} token token of authorised user
 * @returns {UserNotifications} Object containing 20 most recent notifications
 */
export function getNotificationsV1(token: string): UserNotifications {
  const authUser = getUserFromToken(token);
  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }
  let index = 0;
  const notificationsArray: Notification[] = [];
  while (index < authUser.notifications.length && index < LIMIT) {
    notificationsArray.push(authUser.notifications[index]);
    index++;
  }

  return {
    notifications: notificationsArray
  };
}
