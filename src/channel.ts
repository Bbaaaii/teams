import { getChannel, getUser, getUserFromToken, findIfUserReacted, getUserDetails, isGlobalOwner, updateUserChannelStats } from './helper';
import HTTPError from 'http-errors';
import { FORBIDDEN, BAD_REQUEST } from './httpsConsts';
import { Empty } from './types/other';
import { ChannelDetails } from './types/channel';

const PAGINATION = 50;
const END_OF_MESSAGES = -1;

import { Message } from './types/message';
import { MessagesReturn } from './types/channel';

// type USER = { uId: number, email: string, nameFirst: string, nameLast: string, handleStr: string }

/**
 * Returns an object containing info about owner and regular members of a given channel.
 * @param {String} token
 * @param {Number} channelId
 * @returns {Object}
 */
export function channelDetailsV3(token: string, channelId: number): ChannelDetails {
  if (getChannel(channelId) === null) {
    throw HTTPError(BAD_REQUEST, `Channel (${channelId}) doesn't exist`);
  }
  const user = getUserFromToken(token);
  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }

  let userInChannel = false;
  const channel = getChannel(channelId);
  for (const authUser of channel.allMembers) {
    if (authUser.uId === user.uId) {
      userInChannel = true;
    }
  }
  if (!userInChannel) {
    throw HTTPError(FORBIDDEN, `User (${user.uId}) is not an authorized member of channel (${channelId})`);
  }

  return {
    name: channel.name,
    isPublic: channel.isPublic,
    ownerMembers: getUserDetails(channel.ownerMembers),
    allMembers: getUserDetails(channel.allMembers),
  };
}

/** channelJoinV3 - takes a user and adds it to the channel.
 * Will exclusively allow the addition of a global owner (Id = 0) to a private group
 * @param {Number} authUserId
 * @param {Number} channelId
 * @returns { }
 */
export function channelJoinV3(token: string, channelId: number): Empty {
  // check validity of channel id and user id
  const channel = getChannel(channelId);

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel (${channelId}) doesn't exist`);
  }

  const authMember = getUserFromToken(token);

  if (authMember === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }

  // checks that user is not the global owner
  if (channel.isPublic === false && !isGlobalOwner(authMember.uId)) {
    throw HTTPError(FORBIDDEN, 'Channel is private');
  }

  // ensure user is not already a member
  let isMember = false;
  for (const member of channel.allMembers) {
    if (member.uId === authMember.uId) {
      isMember = true;
      break;
    }
  }

  if (isMember) {
    throw HTTPError(BAD_REQUEST, `User (${authMember.uId}) is already a member of channel (${channelId})`);
  }

  const memberObject = { uId: authMember.uId };
  channel.allMembers.push(memberObject);

  updateUserChannelStats(authMember.uId);

  return {};
}

// Invites and automatically adds a user to a specified channel.
// Returns an empty object.
/**
 *
 * @param {number} authUserId Id of authorised user
 * @param {number} channelId Id of channel
 * @param {number} uId Id of invited user
 * @returns {} an empty object
 */
export function channelInviteV3(token: string, channelId: number, uId: number): Empty {
  const channel = getChannel(channelId);
  const invitedUser = getUser(uId);
  const authUser = getUserFromToken(token);

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel (${channelId}) doesn't exist`);
  }

  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }

  if (invitedUser === null) {
    throw HTTPError(BAD_REQUEST, `User (${uId}) doesn't exist`);
  }

  let isUidMember = false;
  let isAuthidMember = false;
  for (const member of channel.allMembers) {
    if (member.uId === uId) {
      isUidMember = true;
    }
    if (member.uId === authUser.uId) {
      isAuthidMember = true;
    }
    if (isAuthidMember === true && isUidMember === true) {
      break;
    }
  }

  if (isUidMember) {
    throw HTTPError(BAD_REQUEST, `User (${uId}) is already a member of channel (${channelId})`);
  }

  if (!isAuthidMember) {
    throw HTTPError(FORBIDDEN, `AuthUser (${authUser.uId}) is not a member of channel (${channelId})`);
  }

  const memberObject = { uId: uId };
  channel.allMembers.push(memberObject);
  invitedUser.notifications.unshift({
    channelId: channel.channelId,
    dmId: -1,
    notificationMessage: `${authUser.handleStr} added you to ${channel.name}`
  });

  updateUserChannelStats(uId);

  return {};
}

// Function returns 50 channel messages from 'start' index.
/**
 *
 * @param {string} token token of authorised user
 * @param {number} channelId Id of channel
 * @param {number} start starting index for requested message
 * @returns {MessageObject} Object containing 50 messages, start and end index
 */
export function channelMessagesV3(token: string, channelId: number, start: number): MessagesReturn {
  const channel = getChannel(channelId);
  const authMember = getUserFromToken(token);

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel (${channelId}) doesn't exist`);
  }

  if (authMember === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }

  const totalMessages = channel.messages.length;
  if (start > totalMessages) {
    throw HTTPError(BAD_REQUEST, `Start index (${start}) does not exist in message history`);
  }

  let isMember = false;
  for (const member of channel.allMembers) {
    if (member.uId === authMember.uId) {
      isMember = true;
      break;
    }
  }

  if (!isMember) {
    throw HTTPError(FORBIDDEN, `Authorised User (${authMember.uId}) is not a member of channel (${channelId})`);
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
    messageObject = channel.messages[messageIndex];
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

/**
 * Removes a member from a channel
 * @param {String} token
 * @param {Number} channelId
 * @returns {Object}
 */
export function channelLeaveV2(token: string, channelId: number): Empty {
  const channel = getChannel(channelId);
  const user = getUserFromToken(token);

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel (${channelId}) doesn't exist`);
  }

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }

  if (channel.standup.user === user.uId) {
    throw HTTPError(BAD_REQUEST, `User (${user.handleStr}) is the starter of an active standup in the channel!`);
  }

  // remove from all members list
  let isMember = false;
  for (const member of channel.allMembers) {
    if (member.uId === user.uId) {
      isMember = true;
      channel.allMembers.splice((channel.allMembers.indexOf(member)), 1);
      break;
    }
  }

  // remove from owners list
  for (const member of channel.ownerMembers) {
    if (member.uId === user.uId) {
      channel.ownerMembers.splice((channel.ownerMembers.indexOf(member)), 1);
      break;
    }
  }

  if (isMember === false) {
    throw HTTPError(FORBIDDEN, `Authorised User (${user.uId}) is not a member of channel (${channelId})`);
  }

  updateUserChannelStats(user.uId);

  return {};
}

/**
 * Adds an owner to a channel
 * @param {String} token
 * @param {Number} channelId
 * @returns {Empty}
 */
export function addOwnerV2(token: string, channelId: number, uId: number): Empty {
  const channel = getChannel(channelId);
  const promoter = getUserFromToken(token);
  const user = getUser(uId);

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel (${channelId}) doesn't exist`);
  }

  if (promoter === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }

  if (user === null) {
    throw HTTPError(BAD_REQUEST, `User (${uId}) doesn't exist`);
  }

  let isMember = false;
  for (const member of channel.allMembers) {
    if (member.uId === user.uId) {
      isMember = true;
      break;
    }
  }

  if (isMember === false) {
    throw HTTPError(BAD_REQUEST, `Authorised User (${user.uId}) is not a member of channel (${channelId})`);
  }

  const isAlreadyOwner = channel.ownerMembers.find((member) => member.uId === user.uId);

  if (isAlreadyOwner) {
    throw HTTPError(BAD_REQUEST, `Authorised User with userId (${uId}) is already a member of channel (${channelId})`);
  }

  const isPromoterOwner = isGlobalOwner(promoter.uId) || channel.ownerMembers.find((member) => member.uId === promoter.uId);

  if (!isPromoterOwner) {
    throw HTTPError(FORBIDDEN, `Authorised User (${promoter.uId}) is not an owner of channel (${channelId})`);
  }

  const memberObject = { uId: user.uId };
  channel.ownerMembers.push(memberObject);

  return {};
}

/** Adds an owner to a channel
* @param {String} token
* @param {Number} channelId
* @returns {Object}
*/
export function removeOwnerV2(token: string, channelId: number, uId: number): Empty {
  const channel = getChannel(channelId);
  const demoter = getUserFromToken(token);
  const user = getUser(uId);

  if (demoter === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel (${channelId}) doesn't exist`);
  }

  if (user === null) {
    throw HTTPError(BAD_REQUEST, `User (${uId}) doesn't exist`);
  }

  if (channel.ownerMembers.length === 1) {
    throw HTTPError(BAD_REQUEST, 'channel has only one owner, they cannot be removed!');
  }

  const isDemoterOwner = isGlobalOwner(demoter.uId) || channel.ownerMembers.find((member) => member.uId === demoter.uId) !== undefined;

  if (!isDemoterOwner) {
    throw HTTPError(FORBIDDEN, `Demoter with valid token (${token}) is not an owner of (${channelId})`);
  }

  const isOwner = isGlobalOwner(user.uId) || channel.ownerMembers.find((member) => member.uId === demoter.uId) !== undefined;

  if (!isOwner) {
    throw HTTPError(FORBIDDEN, `Authorised User (${demoter.uId}) is not an owner of channel (${channelId})`);
  }

  const ownerToDemote = channel.ownerMembers.findIndex((member) => member.uId === user.uId);

  channel.ownerMembers.splice(ownerToDemote, 1);

  return {};
}
