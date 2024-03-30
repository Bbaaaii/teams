import { getData } from './dataStore';
import { getProfileImg, getUserFromToken } from './helper';
import validator from 'validator';
import { Empty } from './types/other';

import { BAD_REQUEST, FORBIDDEN } from './httpsConsts';
import HTTPError from 'http-errors';

import { InnerUserProfile, Users, UserProfile } from './types/users';

const MIN_NAME_LENGTH = 1;
const MAX_NAME_LENGTH = 50;
const MIN_HANDLE_LENGTH = 3;
const MAX_HANDLE_LENGTH = 20;

// type Empty = Record<string, never>;

/**
 * @param {string} token
 * @returns {Users}
 */
export function usersAllV2(token: string): Users {
  const dataStore = getData();
  const user = getUserFromToken(token);
  const res: InnerUserProfile[] = [];

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  for (const user of dataStore.users) {
    res.push({
      uId: user.uId,
      email: user.email,
      nameFirst: user.nameFirst,
      nameLast: user.nameLast,
      handleStr: user.handleStr,
      profileImgUrl: getProfileImg(user.uId)
    });
  }

  return { users: res };
}

/**
 * @param {string} token
 * @param {number} uId
 * @returns {USER}
 */
export function userProfileV3(token: string, uId: number): UserProfile {
  const authUser = getUserFromToken(token);

  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  const dataStore = getData();

  const user = dataStore.users.find((user) => user.uId === uId);
  const removedUser = dataStore.removedUsers.find((user) => user.uId === uId);

  if (user === undefined && removedUser === undefined) {
    throw HTTPError(BAD_REQUEST, `User Id ${uId} does not exist!`);
  }

  const userToReturn = user ?? removedUser;

  return {
    user: {
      uId: userToReturn.uId,
      email: userToReturn.email,
      nameFirst: userToReturn.nameFirst,
      nameLast: userToReturn.nameLast,
      handleStr: userToReturn.handleStr,
      profileImgUrl: getProfileImg(userToReturn.uId)
    }
  };
}

/**
 * @param {string} token
 * @param {string} nameFirst
 * @param {string} nameLast
 * @returns {EMPTY} an empty object
 */
export function userProfileSetNameV2(token: string, nameFirst: string, nameLast: string): Empty {
  const user = getUserFromToken(token);

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (nameFirst.length < MIN_NAME_LENGTH) {
    throw HTTPError(BAD_REQUEST, 'First Name cannot be empty!');
  }

  if (nameFirst.length > MAX_NAME_LENGTH) {
    throw HTTPError(BAD_REQUEST, 'First Name too long!');
  }

  if (nameLast.length < MIN_NAME_LENGTH) {
    throw HTTPError(BAD_REQUEST, 'Last Name cannot be empty!');
  }

  if (nameLast.length > MAX_NAME_LENGTH) {
    throw HTTPError(BAD_REQUEST, 'Last Name too long!');
  }

  user.nameFirst = nameFirst;
  user.nameLast = nameLast;

  return {};
}

/**
 * @param {string} token
 * @param {string} email
 * @returns {EMPTY} an empty object
 */
export function userProfileSetEmailV2(token: string, email: string): Empty {
  const dataStore = getData();
  const user = getUserFromToken(token);

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (!validator.isEmail(email)) {
    throw HTTPError(BAD_REQUEST, `${email} is not a valid email!`);
  }

  if (
    dataStore.users.find((userObject) => {
      return userObject.email === email;
    }) !== undefined
  ) {
    throw HTTPError(BAD_REQUEST, `${email} already exists!`);
  }

  user.email = email;

  return {};
}

export function userProfileSetHandleV2(token: string, handleStr: string): Empty {
  const dataStore = getData();
  const user = getUserFromToken(token);

  const regex = /^[A-Za-z0-9]+$/;

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (handleStr.length < MIN_HANDLE_LENGTH) {
    throw HTTPError(BAD_REQUEST, 'Handle too short!');
  }

  if (handleStr.length > MAX_HANDLE_LENGTH) {
    throw HTTPError(BAD_REQUEST, 'Handle too long!');
  }

  if (regex.test(handleStr) === false) {
    throw HTTPError(BAD_REQUEST, 'Handle should be alphanumeric!');
  }

  if (
    dataStore.users.find((userObject) => {
      return userObject.handleStr === handleStr;
    }) !== undefined
  ) {
    throw HTTPError(BAD_REQUEST, `${handleStr} already exists!`);
  }

  console.log(`Changing handle from ${user.handleStr} to ${handleStr}`);
  user.handleStr = handleStr;
  console.log(`Handle is now ${user.handleStr}`);

  return {};
}

export function userStatsV1(token: string) {
  const dataStore = getData();
  const user = getUserFromToken(token);
  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }
  const numUserChannelsJoined = user.userStats.channelsJoined[user.userStats.channelsJoined.length - 1].numChannelsJoined;
  const numUserDmsJoined = user.userStats.dmsJoined[user.userStats.dmsJoined.length - 1].numDmsJoined;
  const numUserMessagesSent = user.userStats.messagesSent[user.userStats.messagesSent.length - 1].numMessagesSent;

  const numeratorIR = numUserChannelsJoined + numUserDmsJoined + numUserMessagesSent;
  const denominatorIR = dataStore.numChannels + dataStore.numDms + dataStore.numMsgs;
  let involvementRate;
  if (denominatorIR === 0) {
    involvementRate = 0;
  } else {
    involvementRate = numeratorIR / denominatorIR;
  }

  if (involvementRate > 1) {
    involvementRate = 1;
  }

  const returnStats = {
    channelsJoined: user.userStats.channelsJoined,
    dmsJoined: user.userStats.dmsJoined,
    messagesSent: user.userStats.messagesSent,
    involvementRate: involvementRate
  };

  return returnStats;
}

export function workspaceStatsV1(token: string) {
  const dataStore = getData();
  const authUser = getUserFromToken(token);
  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  let activeUsers = 0;

  for (const user of dataStore.users) {
    let userIsActive = false;
    for (const channel of dataStore.channels) {
      if (channel.allMembers.find((channelUser) => channelUser.uId === user.uId) !== undefined) {
        userIsActive = true;
      }
    }

    for (const dm of dataStore.dms) {
      if (dm.members.find((dmUser) => dmUser === user.uId) !== undefined) {
        userIsActive = true;
      }
    }

    if (userIsActive === true) {
      activeUsers++;
    }
  }

  const utilization = activeUsers / dataStore.users.length;

  const returnStats = {
    channelsExist: dataStore.workspaceStats.channelsExist,
    dmsExist: dataStore.workspaceStats.dmsExist,
    messagesExist: dataStore.workspaceStats.messagesExist,
    utilizationRate: utilization
  };

  return returnStats;
}
