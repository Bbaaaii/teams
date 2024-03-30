import { getData } from './dataStore';
import { hashString } from './hash';
import { url, port } from './config.json';
import { NOT_MODIFIED, OK } from './httpsConsts';

import request from 'sync-request';

import { Dm } from './types/dm';
import { Permission, User, UserArchive } from './types/users';
import { Message } from './types/message';
import { ChannelMember } from './types/channel';
import { InnerUserProfile, channelStats, messageStats, dmStats } from './types/users';
import { channelsExist, messagesExist, dmsExist } from './types/dataStore';

import { Channel } from './types/channel';

const MS = 1000;

export const DEFAULT_PROFILE_IMG = `${url}:${port}/img/default.jpg`;

/**
 * Gets the object of a user which matches the provided email
 * @param {string} email Email of user to search for
 * @returns {object|undefined} Object containing user data
 */
export function getUserFromEmail(email: string): User | undefined {
  const dataStore = getData();

  for (const user of dataStore.users) {
    if (user.email === email) {
      return user;
    }
  }

  return undefined;
}

/**
 * Generates the next expected id for a user
 * @returns {number}
 */
export function getUserNextId(): number {
  const dataStore = getData();

  if (dataStore.users.length === 0) {
    return 0;
  }

  const allUserIds = dataStore.users.map((userObject) => userObject.uId);

  // Need to unpack this array as it compares sets
  return Math.max(...allUserIds) + 1;
}

/**
 * Generates the next expected id for a user
 * @returns {number}
 */
export function getDmNextId(): number {
  const dataStore = getData();

  if (dataStore.dms.length === 0) {
    return 0;
  }

  const allDmIds = dataStore.dms.map((dmObject) => dmObject.dmId);

  // Need to unpack this array as it compares sets
  return Math.max(...allDmIds) + 1;
}

/**
 * Checks whether a user handle already exists
 * @param {string} handleStr Handle to check
 * @returns {boolean}
 */
export function handleExists(handleStr: string): boolean {
  const users = getData().users;

  const foundObject = users.find(
    (userObject) => userObject.handleStr === handleStr
  );

  return foundObject !== undefined;
}

// NOTE: Keeping uppercase letters in the regex despite lowering them in case just for correctness of the regex statement
const alphanumericRegex = /[^a-zA-Z0-9]/g;

/**
 * Generates a unique handle string for a user, depending on their first and second name
 * @param {string} nameFirst First name of user
 * @param {string} nameSecond Second name of user
 * @returns {string} Unique handle string for user
 */
export function generateUniqueHandle(nameFirst: string, nameSecond: string): string {
  let handleStr =
    nameFirst.toLowerCase().replace(alphanumericRegex, '') +
    nameSecond.toLowerCase().replace(alphanumericRegex, '');

  handleStr = handleStr.slice(0, 20);

  const numericIndex = handleStr.length;

  let endNumber = 0;

  while (handleExists(handleStr)) {
    handleStr = handleStr.slice(0, numericIndex) + endNumber;

    endNumber++;
  }

  return handleStr;
}

/**
 * Generates the next expected id for a channel
 * code adapted from getUserNextId() in auth.js
 * @returns {number}
 */
export function getNextChannelId(): number {
  const dataStore = getData();

  if (dataStore.channels.length === 0) {
    return 0;
  }

  const allChannelIds = dataStore.channels.map(
    (channelObject) => channelObject.channelId
  );

  // Need to unpack this array as it compares sets
  return Math.max(...allChannelIds) + 1;
}

/**
 * Gets channel object from channelId
 * @param {Number} channelId
 * @returns {Object}
 */
export function getChannel(channelId: number): Channel | null {
  const data = getData();

  const channel = data.channels.find((channel) => channel.channelId === channelId);

  if (channel === undefined) {
    return null;
  }

  return channel;
}

/**
 * Gets user object from userId
 * @param {Number} userId
 * @returns {Object}
 */
export function getUser(userId: number): User {
  const data = getData();

  const user = data.users.find((user) => user.uId === userId);

  if (user === undefined) {
    return null;
  }

  return user;
}

/**
 * Gets a user based on a token, returning null if the token is not valid
 * @param token unhashed token
 * @returns {USER} user object
 */
export function getUserFromToken(token: string): User {
  const data = getData();

  const hashedToken = hashString(token);

  const user = data.users.find((user) => user.tokens.includes(hashedToken));

  return user === undefined ? null : user;
}

export function arrayCount(arr: number[], element: number) {
  return arr.filter((currentElement) => currentElement === element).length;
}

/**
 * Generates the next expected id for a dm message
 * If id is generated for a sendLater function, the id is put into reservedMessage array so that...
 * there are no duplicates of messageIds before the message is sent.
 * reserved will only === true if called by sendLater function.
 * @param {boolean} reserved boolean value for if message is sent later or not.
 * @returns {number} id of next message
 */
export function getNextMessageId(reserved: boolean): number {
  const dataStore = getData();

  const allMessageIds: number[] = [];
  for (const channel of dataStore.channels) {
    for (const message of channel.messages) {
      if (channel.messages.length > 0) {
        allMessageIds.push(message.messageId);
      }
    }
  }

  for (const dm of dataStore.dms) {
    for (const message of dm.messages) {
      if (dm.messages.length > 0) {
        allMessageIds.push(message.messageId);
      }
    }
  }

  if (allMessageIds.length === 0 && dataStore.reservedMessageIds.length === 0) {
    if (reserved) {
      dataStore.reservedMessageIds.push(0);
    }
    return 0;
  }

  let reservedMax = 0;
  if (dataStore.reservedMessageIds.length > 0) {
    reservedMax = Math.max(...dataStore.reservedMessageIds) + 1;
  }

  let allMessageMax = 0;
  if (allMessageIds.length > 0) {
    allMessageMax = Math.max(...allMessageIds) + 1;
  }

  const nextId = reservedMax <= allMessageMax ? allMessageMax : reservedMax;
  if (reserved) {
    dataStore.reservedMessageIds.push(nextId);
  }

  return nextId;
}

/**
 * Return the message corresponding to the message id.
 * @param {number} messageId id of message
 */
export function getChannelMessage(messageId: number) {
  const dataStore = getData();

  for (const channel of dataStore.channels) {
    let index = 0;
    for (const message of channel.messages) {
      if (channel.messages.length > 0 && message.messageId === messageId) {
        return {
          message: message,
          channel: channel,
          index: index
        };
      }
      index++;
    }
  }
  return null;
}

export function getDmMessage(messageId: number) {
  const dataStore = getData();

  for (const dm of dataStore.dms) {
    let index = 0;
    for (const message of dm.messages) {
      if (dm.messages.length > 0 && message.messageId === messageId) {
        return {
          message: message,
          dm: dm,
          index: index
        };
      }
      index++;
    }
  }
  return null;
}

/**
 * Adds a user to the global owners list
 * @param uId Id of user to add to global owners
 */
export function addGlobalOwner(uId: number) {
  const data = getData();

  if (data.globalOwners.includes(uId)) {
    return;
  }

  data.globalOwners.push(uId);
}

/**
 * Remove a user from the global owners list
 * @param uId Id of user to remove from global owners
 */
export function removeGlobalOwner(uId: number) {
  const data = getData();

  const index = data.globalOwners.indexOf(uId);

  if (index > -1) {
    data.globalOwners.splice(index, 1);
  }
}

export function globalOwnerCount(): number {
  return getData().globalOwners.length;
}

export function isGlobalOwner(uId: number): boolean {
  return getData().globalOwners.includes(uId);
}

export function userHasPermission(uId: number, permission: Permission): boolean {
  if ((isGlobalOwner(uId) && permission === Permission.OWNER) || (!isGlobalOwner(uId) && permission === Permission.MEMBER)) {
    return true;
  }

  return false;
}

export function isOwnerMember(id: number, uid: number, isChannel: boolean) {
  if (isChannel) {
    const channel = getChannel(id);

    for (const owner of channel.ownerMembers) {
      if (owner.uId === uid) {
        return true;
      }
    }

    return isGlobalOwner(uid);
  } else {
    const dm = getDm(id);

    if (dm.owner === uid) {
      return true;
    }

    return false;
  }
}

export function isMember(id: number, uid: number, isChannel: boolean) {
  if (isChannel) {
    const channel = getChannel(id);
    const member = channel.allMembers.find(user => user.uId === uid);
    if (member !== undefined) {
      return true;
    }
    return false;
  } else {
    const dm = getDm(id);
    const dmMember = dm.members.find(member => member === uid);
    if (dmMember !== undefined) {
      return true;
    }
    return false;
  }
}

/**
 * finds reacts that a user has reacted to and updates the isThisUserReacted variable accordingly
 * @param {number} authUserId id of authUser
 * @param {MESSAGE} messageObject message to be searched for reacts
 */
export function findIfUserReacted(authUserId: number, messageObject: Message) {
  for (const react of messageObject.reacts) {
    const reacted = react.uIds.find(uId => uId === authUserId);
    if (reacted !== undefined) {
      react.isThisUserReacted = true;
    } else {
      react.isThisUserReacted = false;
    }
  }
}

/**
 * Gets dm object from dmId
 * @param {Number} channelId
 * @returns {Object}
 */
export function getDm(dmId: number): Dm | null {
  const data = getData();

  for (const dm of data.dms) {
    if (dm.dmId === dmId) {
      return dm;
    }
  }
  return null;
}

/**
 * Checks whether a user handle exists and returns the user if true
 * @param {string} handleStr Handle to check
 * @returns {USER}
 */
export function getUserFromHandle(handleStr: string): User {
  const users = getData().users;

  const foundUser = users.find(
    (userObject) => userObject.handleStr === handleStr
  );

  if (foundUser !== undefined) {
    return foundUser;
  }

  return null;
}

/**
 * Extracts all userHandles from all tags in a string.
 * Returns the array of userHandles in the string
 * @param {string} str
 * @returns {string[]}
 */
export function extractHandles(str: string): string[] {
  const handles = [];
  let substr = str;
  while (substr.includes('@')) {
    const startIndex = substr.indexOf('@') + 1;
    const substrAfterAt = substr.substring(startIndex);
    const endIndex = substrAfterAt.search(/[^a-zA-Z0-9]/);
    const handle = endIndex < 0 ? substrAfterAt : substrAfterAt.substring(0, endIndex);
    handles.push(handle);
    substr = substrAfterAt.substring(endIndex);
  }
  const uniqueHandles = handles.filter((value, index, self) => {
    return self.indexOf(value) === index;
  });
  return uniqueHandles;
}
export function getRemovedUser(uId: number): UserArchive {
  const data = getData();

  for (const user of data.removedUsers) {
    if (user.uId === uId) {
      return user;
    }
  }
  return null;
}
/**
   * Gets the profile image url of a user, returning the default if they have none
   * @param {number} userId  id of user
   * @returns {string} profile image of user
   */
export function getProfileImg(userId: number): string {
  const profileImg = getData().profileImages.find((pfp) => pfp.uId === userId);
  if (profileImg === undefined) {
    return DEFAULT_PROFILE_IMG;
  }
  return profileImg.profileImgUrl;
}

export function setProfileImg(userId: number) {
  const dataStore = getData();
  const imgPath = getImagePath(`${userId}.jpg`);

  const curPfp = dataStore.profileImages.find((pfp) => pfp.uId === userId);

  if (curPfp !== undefined) {
    curPfp.profileImgUrl = imgPath;
    return;
  }

  dataStore.profileImages.push({
    uId: userId,
    profileImgUrl: imgPath,
  });
}

export function validateCropSize(startX: number, startY: number, endX: number, endY: number): boolean {
  if (startX < 0 || startY < 0 || endX < 0 || endY < 0) {
    return false;
  }
  if (endX <= startX || endY <= startY) {
    return false;
  }
  return true;
}
export function getImage(image: string) {
  const res = request('GET', image, { headers: { 'Content-Type': 'image/jpeg' }, timeout: 5000 });
  if (res.statusCode !== OK && res.statusCode !== NOT_MODIFIED) {
    return res.statusCode;
  }
  return res.getBody() as Buffer;
}
export function getImagePath(imageName: string) {
  return `${url}:${port}/img/${imageName}`;
}
/**
   * Gets user details from channel members (excluding passwords)
   * @param {Object} channelMembers
   * @param {Number} channelId
   * @returns {Object} user details
   */
export function getUserDetails(channelMembers: ChannelMember[]): InnerUserProfile[] {
  const userDetails = [];
  for (const member of channelMembers) {
    const user = getUser(member.uId);
    userDetails.push({
      uId: user.uId,
      email: user.email,
      nameFirst: user.nameFirst,
      nameLast: user.nameLast,
      handleStr: user.handleStr,
      profileImgUrl: getProfileImg(user.uId),
    });
  }
  return userDetails;
}

export function updateUserChannelStats(uId: number) {
  const data = getData();
  const user = getUser(uId);
  const timeNow = Math.floor((new Date()).getTime() / MS);

  let numChannels = 0;
  for (const channel of data.channels) {
    if (isMember(channel.channelId, user.uId, true)) {
      numChannels++;
    }
  }
  const newChannelStats: channelStats = {
    numChannelsJoined: numChannels,
    timeStamp: timeNow
  };

  user.userStats.channelsJoined.push(newChannelStats);
}

export function updateUserDmStats(uId: number) {
  const data = getData();
  const user = getUser(uId);
  const timeNow = Math.floor((new Date()).getTime() / MS);

  let numDms = 0;
  for (const dm of data.dms) {
    if (isMember(dm.dmId, user.uId, false)) {
      numDms++;
    }
  }
  const newDmStats: dmStats = {
    numDmsJoined: numDms,
    timeStamp: timeNow
  };

  user.userStats.dmsJoined.push(newDmStats);
}

export function updateUserMessageSent(uId: number) {
  const user = getUser(uId);
  const timeNow = Math.floor((new Date()).getTime() / MS);

  const numCurrMessageSent = user.userStats.messagesSent[user.userStats.messagesSent.length - 1].numMessagesSent;
  const newMessageStats: messageStats = {
    numMessagesSent: numCurrMessageSent + 1,
    timeStamp: timeNow
  };

  user.userStats.messagesSent.push(newMessageStats);
}

export function updateWorkplaceChannelsStats() {
  const data = getData();
  const timeNow = Math.floor((new Date()).getTime() / MS);

  const newChannelStats: channelsExist = {
    numChannelsExist: data.numChannels,
    timeStamp: timeNow
  };

  data.workspaceStats.channelsExist.push(newChannelStats);
}

export function updateWorkplaceDmsStats() {
  const data = getData();
  const timeNow = Math.floor((new Date()).getTime() / MS);

  const newDmsStats: dmsExist = {
    numDmsExist: data.numDms,
    timeStamp: timeNow
  };

  data.workspaceStats.dmsExist.push(newDmsStats);
}

export function updateWorkplaceMessagesStats() {
  const data = getData();
  const timeNow = Math.floor((new Date()).getTime() / MS);

  const newMessagesStats: messagesExist = {
    numMessagesExist: data.numMsgs,
    timeStamp: timeNow
  };

  data.workspaceStats.messagesExist.push(newMessagesStats);
}
