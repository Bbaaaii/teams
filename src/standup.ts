import { getData } from './dataStore';
import { getUserFromToken, getChannel, isMember, getNextMessageId, updateUserMessageSent, updateWorkplaceMessagesStats } from './helper';

import { BAD_REQUEST, FORBIDDEN } from './httpsConsts';
import HTTPError from 'http-errors';
import { Empty } from './types/other';
import { Message } from './types/message';

import { StandupStart } from './types/standup';

const MAX_MESSAGE_LENGTH = 1000;
let sendCalled = false;

/**
 * @param {string} token
 * @param {number} channelId
 * @param {number} length
 * @returns {STANDUP_START} the time the standup will finish
 */
export function standupStartV1(token: string, channelId: number, length: number): StandupStart {
  const user = getUserFromToken(token);
  const channel = getChannel(channelId);

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel ${channelId} does not exist!`);
  }

  if (length < 0) {
    throw HTTPError(BAD_REQUEST, `Length ${length} is invalid!`);
  }

  if (channel.standup.isActive) {
    throw HTTPError(BAD_REQUEST, 'A standup is already running!');
  }

  if (isMember(channelId, user.uId, true) === false) {
    throw HTTPError(FORBIDDEN, 'You are not a member of that channel!');
  }

  const timeFinish = Math.floor((new Date()).getTime() / 1000) + length;

  channel.standup = {
    isActive: true,
    timeFinish: timeFinish,
    messageStr: '',
    user: user.uId
  };

  const sessionId = getData().sessionId;
  setTimeout(standupEnd, length * 1000, channelId, user.uId, sessionId);

  const dataStore = getData();
  if (sendCalled) {
    dataStore.numMsgs++;
    updateWorkplaceMessagesStats();
    updateUserMessageSent(user.uId);
  }

  return { timeFinish: timeFinish };
}

function standupEnd(channelId: number, uId: number, sessionId: number) {
  if (sessionId !== getData().sessionId) {
    // the server has been cleared since standup was created, abort
    return;
  }

  const channel = getChannel(channelId);
  if (channel !== null) {
    if (channel.standup.messageStr !== '') {
      const messageId = getNextMessageId(false);
      const seconds = Math.floor((new Date()).getTime() / 1000);
      const messageObject: Message = {
        messageId: messageId,
        uId: uId,
        message: channel.standup.messageStr,
        timeSent: seconds,
        isPinned: false,
        reacts: []
      };
      channel.messages.unshift(messageObject);
    }

    channel.standup = {
      isActive: false,
      timeFinish: null,
      messageStr: '',
      user: null
    };
  }
}

/**
 * @param {string} token
 * @param {number} channelId
 * @returns {STANDUP_ACTIVE} whether a standup is running and if so, the time it'll finish
 */
export function standupActiveV1(token: string, channelId: number): StandupStart {
  const user = getUserFromToken(token);
  const channel = getChannel(channelId);

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel ${channelId} does not exist!`);
  }

  if (isMember(channelId, user.uId, true) === false) {
    throw HTTPError(FORBIDDEN, 'You are not a member of that channel!');
  }

  const res = {
    isActive: channel.standup.isActive,
    timeFinish: channel.standup.timeFinish
  };

  return res;
}

/**
 * @param {string} token
 * @param {number} channelId
 * @param {string} message
 * @returns { EMPTY }
 */
export function standupSendV1(token: string, channelId: number, message: string): Empty {
  const user = getUserFromToken(token);
  const channel = getChannel(channelId);

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel ${channelId} does not exist!`);
  }

  if (isMember(channelId, user.uId, true) === false) {
    throw HTTPError(FORBIDDEN, 'You are not a member of that channel!');
  }

  if (channel.standup.isActive === false) {
    throw HTTPError(BAD_REQUEST, 'A standup is not running!');
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw HTTPError(BAD_REQUEST, 'Message is too long!');
  }

  if (channel.standup.messageStr !== '') {
    channel.standup.messageStr += '\n';
  }
  channel.standup.messageStr += `${user.handleStr}: ${message}`;
  sendCalled = true;

  return {};
}
