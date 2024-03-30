import { getData } from './dataStore';
import {
  getUser,
  getDmNextId,
  getUserFromToken,
  arrayCount,
  getDm,
  findIfUserReacted,
  updateUserDmStats,
  updateWorkplaceDmsStats,
  updateWorkplaceMessagesStats
} from './helper';
import { InnerUserProfile, User } from './types/users';
import { BAD_REQUEST, FORBIDDEN } from './httpsConsts';
import HTTPError from 'http-errors';

import { Message } from './types/message';
import { userProfileV3 } from './users';
import { DmCreateObject, DmDetails, DmListView, DmMessagesReturn } from './types/dm';

const PAGINATION = 50;
const END_OF_MESSAGES = -1;

/**
 *
 * @param {string} token
 * @param {number[]} uIds
 * @returns {DmCreateObject}
 * Assumption: User ids start from 0
 */
export function dmCreateV2(token: string, uIds: number[]): DmCreateObject {
  const owner = getUserFromToken(token);
  if (owner == null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  const addedUsers = uIds;
  const handles = [];
  addedUsers.unshift(owner.uId);

  for (const member of addedUsers) {
    if (arrayCount(addedUsers, member) > 1) {
      throw HTTPError(BAD_REQUEST, `Duplicate uId ${member}!`);
    }

    if (getUser(member) == null) {
      throw HTTPError(BAD_REQUEST, `User ${member} does not exist!`);
    }

    handles.push(getUser(member).handleStr);
  }

  handles.sort();
  const dmName = handles.join(', ');

  const messages: Message[] = [];
  const dmId = getDmNextId();
  const newDm = {
    dmId: dmId,
    name: dmName,
    members: addedUsers,
    owner: owner.uId,
    messages: messages,
    isPinned: false
  };

  const data = getData();

  data.dms.push(newDm);

  let user: User;
  for (const userId of uIds.slice(1)) {
    user = getUser(userId);
    user.notifications.unshift({
      channelId: -1,
      dmId: dmId,
      notificationMessage: `${owner.handleStr} added you to ${dmName}`
    });
  }

  const dataStore = getData();
  dataStore.numDms++;
  updateWorkplaceDmsStats();
  updateUserDmStats(owner.uId);
  for (const member of uIds) {
    updateUserDmStats(member);
  }

  return { dmId: dmId };
}

/**
 *
 * @param {string} token
 * @returns {DmCreateObject}
 * Assumption: Returns them in the order they were created
 */
export function dmListV2(token: string): DmListView {
  const dms = [];
  const user = getUserFromToken(token);
  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  const data = getData();

  for (const dm of data.dms) {
    if (dm.members.indexOf(user.uId) !== -1) {
      dms.push({
        dmId: dm.dmId,
        name: dm.name
      });
    }
  }

  return { dms: dms };
}

/**
 * Removes a dm with the specified id
 * @param {string} token user token
 * @param {number} dmId id of dm
 * @returns {ERROR | object} error or empty object
 */
export function dmRemoveV2(token: string, dmId: number): object {
  const user = getUserFromToken(token);
  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  const dm = getDm(dmId);

  if (dm === null) {
    throw HTTPError(BAD_REQUEST, `Dm (${dmId}) doesn't exist!`);
  }

  if (dm.owner !== user.uId) {
    throw HTTPError(FORBIDDEN, `User is not owner of dm to remove (${user.uId})!`);
  }

  if (!dm.members.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, `User is not member of dm to remove (${user.uId})!`);
  }

  const data = getData();

  const members = dm.members;

  data.numMsgs = data.numMsgs - dm.messages.length;
  updateWorkplaceMessagesStats();

  data.dms.splice(data.dms.indexOf(dm), 1);

  data.numDms--;
  updateWorkplaceDmsStats();

  for (const member of members) {
    updateUserDmStats(member);
  }

  return {};
}

/**
 * Gets the details of a dm
 * @param {string} token user token
 * @param {number} dmId id of dm
 * @returns {DmDetails}details of dm or error
 */
export function dmDetailsV2(token: string, dmId: number): DmDetails {
  const user = getUserFromToken(token);

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  const userDm = getDm(dmId);

  if (userDm === null) {
    throw HTTPError(BAD_REQUEST, `Dm (${dmId}) doesn't exist!`);
  }

  if (userDm.members.indexOf(user.uId) === -1) {
    throw HTTPError(FORBIDDEN, `user (${user.uId}) is not a member of dm (${dmId})!`);
  }

  // Need to create a new array as we don't want to modify the original!
  const members: InnerUserProfile[] = [];
  for (const member of userDm.members) {
    const user = userProfileV3(token, member).user;

    members.push(user);
  }

  return { name: userDm.name, members: members };
}

/**
 * Removes the user from the relevant dm
 * @param {string} token user token
 * @param {number} dmId id of dm
 * @returns {}
 */
export function dmLeaveV2(token: string, dmId: number) {
  const dm = getDm(dmId);
  const authMember = getUserFromToken(token);

  if (dm === null) {
    throw HTTPError(BAD_REQUEST, `Dm (${dmId}) doesn't exist!`);
  }

  if (authMember === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  const data = getData();
  const dmIndex = data.dms.findIndex(element => element.dmId === dmId);

  if (dmIndex === -1) {
    throw HTTPError(BAD_REQUEST, `Dm (${dmId}) doesn't exist!`);
  }

  const personIndex = data.dms[dmIndex].members.findIndex(element => element === authMember.uId);

  if (personIndex === -1) {
    throw HTTPError(FORBIDDEN, `User (${authMember.uId}) is not a member of dm (${dmId})!`);
  }

  data.dms[dmIndex].members.splice(personIndex, 1);

  updateUserDmStats(authMember.uId);

  return {};
}

// Function returns 50 dm messages from 'start' index.
/**
 *
 * @param {string} token token of authorised user
 * @param {number} dmId Id of channel
 * @param {number} start starting index for requested message
 * @returns {MessageObject} Object containing 50 messages, start and end index
 */
export function dmMessagesV2(token: string, dmId: number, start: number): DmMessagesReturn {
  const dm = getDm(dmId);
  const authMember = getUserFromToken(token);

  if (dm === null) {
    throw HTTPError(BAD_REQUEST, `Dm (${dmId}) doesn't exist!`);
  }

  if (authMember === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  const totalMessages = dm.messages.length;
  if (start > totalMessages) {
    throw HTTPError(BAD_REQUEST, `Start index (${start}) does not exist in message history`);
  }

  let isMember = false;
  for (const member of dm.members) {
    if (member === authMember.uId) {
      isMember = true;
      break;
    }
  }

  if (!isMember) {
    throw HTTPError(FORBIDDEN, `Authorised User (${authMember.uId}) is not a member of dm (${dmId})`);
  }

  let endIndex = start + PAGINATION;
  let messageIndex = start;
  const requestedMessages: Message[] = [];
  let messageObject: Message;

  while (
    messageIndex >= 0 &&
    messageIndex < totalMessages &&
    messageIndex < endIndex
  ) {
    messageObject = dm.messages[messageIndex];
    findIfUserReacted(authMember.uId, messageObject);
    requestedMessages.push(messageObject);
    messageIndex++;
  }

  if (messageIndex === totalMessages || messageIndex < 0) {
    endIndex = END_OF_MESSAGES;
  }

  return {
    messages: requestedMessages,
    start: start,
    end: endIndex,
  };
}
