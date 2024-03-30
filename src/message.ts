import {
  getChannel,
  getUserFromToken,
  getNextMessageId,
  getDm,
  getChannelMessage,
  getDmMessage,
  isOwnerMember,
  isMember,
  getUser,
  extractHandles,
  getUserFromHandle,
  isGlobalOwner,
  updateUserMessageSent,
  updateWorkplaceMessagesStats
} from './helper';

import { intializeGame, makeGuess, stopGame, hangmanHelp } from './hangman';

const NOTIFICATION_MESSAGE = 20;

import { getData } from './dataStore';
import { Message } from './types/message';
import { React } from './types/message';
import { Empty } from './types/other';
import { FORBIDDEN, BAD_REQUEST } from './httpsConsts';
import HTTPError from 'http-errors';

import { MessageId, SharedMessageId } from './types/message';
import { User } from './types/users';

const LOWERLIMIT = 1;
const UPPERLIMIT = 1000;
const MS = 1000;

/**
 * Sends a message from a channel member to the channel.
 * Returns the id of the sent message or error.
 * @param {string} token token of authorised user
 * @param {number} channelId Id of channel
 * @param {string} message user message
 * @returns {MessageId} id of message
 */
export function messageSendV2(token: string, channelId: number, message: string): MessageId {
  const channel = getChannel(channelId);
  const authUser = getUserFromToken(token);

  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel ${channelId} does not exist!`);
  }

  let isChannelMember = false;
  for (const member of channel.allMembers) {
    if (member.uId === authUser.uId) {
      isChannelMember = true;
      break;
    }
  }

  if (!isChannelMember) {
    throw HTTPError(FORBIDDEN, `Authorised User (${authUser.uId}) is not a member of channel (${channelId})`);
  }

  if (message.length < LOWERLIMIT || message.length > UPPERLIMIT) {
    throw HTTPError(BAD_REQUEST, 'Your message is not the accepted length!');
  }

  const messageId = getNextMessageId(false);
  const seconds = Math.floor((new Date()).getTime() / 1000);
  const messageObject: Message = {
    messageId: messageId,
    uId: authUser.uId,
    message: message,
    timeSent: seconds,
    isPinned: false,
    reacts: []
  };

  channel.messages.unshift(messageObject);

  const handles = extractHandles(message);
  if (handles.length > 0) {
    let notifiedUser: User;
    for (const handle of handles) {
      notifiedUser = getUserFromHandle(handle);
      if (notifiedUser !== null && isMember(channel.channelId, notifiedUser.uId, true)) {
        notifiedUser.notifications.unshift({
          channelId: channel.channelId,
          dmId: -1,
          notificationMessage: `${authUser.handleStr} tagged you in ${channel.name}: ${message.substring(0, NOTIFICATION_MESSAGE)}`
        });
      }
    }
  }

  const dataStore = getData();
  dataStore.numMsgs++;
  updateWorkplaceMessagesStats();
  updateUserMessageSent(authUser.uId);

  if (message.slice(0, 5) === '/play') {
    intializeGame(message, channelId);
  } else if (message.slice(0, 6) === '/guess') {
    makeGuess(message, channelId);
  } else if (message === '/stop') {
    stopGame(channelId);
  } else if (message === '/help') {
    hangmanHelp(channelId);
  }

  return {
    messageId: messageId
  };
}

/**
 * Edits a sent message with a new message string.
 * Returns an empty object.
 * @param {string} token token of authorised user
 * @param {number} messagelId Id of message
 * @param {string} message new message
 * @returns {} an empty object
 * @returns {ERROR} error message
 */
export function messageEditV2(token: string, messageId: number, message: string): Empty {
  const authUser = getUserFromToken(token);
  const channelMessage = getChannelMessage(messageId);
  const dmMessage = getDmMessage(messageId);
  let isChannelMessage = true;

  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (channelMessage === null) {
    isChannelMessage = false;
    if (dmMessage === null) {
      throw HTTPError(BAD_REQUEST, `Message ${messageId} does not exist!`);
    }
  }

  if (message.length > UPPERLIMIT) {
    throw HTTPError(BAD_REQUEST, 'Your message is over the accepted length!');
  }

  if (isChannelMessage) {
    if (channelMessage.message.uId !== authUser.uId && isOwnerMember(channelMessage.channel.channelId, authUser.uId, true) === false) {
      throw HTTPError(FORBIDDEN, 'You don\'t have the permisssions to edit this message');
    }

    if (message === '') {
      const index = channelMessage.index;
      const channel = channelMessage.channel;
      channel.messages.splice(index, 1);
    } else {
      const handles = extractHandles(message);
      if (handles.length > 0) {
        let notifiedUser: User;
        for (const handle of handles) {
          notifiedUser = getUserFromHandle(handle);
          if (notifiedUser !== null && isMember(channelMessage.channel.channelId, notifiedUser.uId, true)) {
            notifiedUser.notifications.unshift({
              channelId: channelMessage.channel.channelId,
              dmId: -1,
              notificationMessage: `${authUser.handleStr} tagged you in ${channelMessage.channel.name}: ${message.substring(0, NOTIFICATION_MESSAGE)}`
            });
          }
        }
      }
      channelMessage.message.message = message;
    }
  } else {
    if (dmMessage.message.uId !== authUser.uId && isOwnerMember(dmMessage.dm.dmId, authUser.uId, false) === false) {
      throw HTTPError(FORBIDDEN, 'You don\'t have the permisssions to edit this message');
    }

    if (message === '') {
      const index = dmMessage.index;
      const dm = dmMessage.dm;
      dm.messages.splice(index, 1);
    } else {
      const handles = extractHandles(message);
      if (handles.length > 0) {
        let notifiedUser: User;
        for (const handle of handles) {
          notifiedUser = getUserFromHandle(handle);
          if (notifiedUser !== null && isMember(dmMessage.dm.dmId, notifiedUser.uId, false)) {
            notifiedUser.notifications.unshift({
              channelId: -1,
              dmId: dmMessage.dm.dmId,
              notificationMessage: `${authUser.handleStr} tagged you in ${dmMessage.dm.name}: ${message.substring(0, NOTIFICATION_MESSAGE)}`
            });
          }
        }
      }
      dmMessage.message.message = message;
    }
  }

  return {};
}

// Deletes a sent message in a channel/dm.
// Returns an empty/error object.
/**
 *
 * @param {string} token token of authorised user
 * @param {number} messageId Id of message
 * @returns {} an empty object
 * @returns {ERROR} error message
 */
export function messageRemoveV2(token: string, messageId: number) {
  const authUser = getUserFromToken(token);
  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (isNaN(messageId) === true || messageId < 0) {
    throw HTTPError(BAD_REQUEST, `Message ${messageId} does not exist!`);
  }

  const data = getData();

  const dm = data.dms.find(dm => dm.messages.some(msg => msg.messageId === messageId));
  if (dm !== undefined) {
    const message = dm.messages.find(msg => msg.messageId === messageId);
    const msgIndex = dm.messages.findIndex(msg => msg.messageId === messageId);
    if (message.uId === authUser.uId || dm.owner === authUser.uId || authUser.uId === 0) {
      dm.messages.splice(msgIndex, 1);
      data.numMsgs--;
      updateWorkplaceMessagesStats();
      return {};
    } else {
      throw HTTPError(FORBIDDEN, "Can not delete other user's messages");
    }
  }

  const channel = data.channels.find(channel => channel.messages.some(msg => msg.messageId === messageId));
  if (channel !== undefined) {
    const message = channel.messages.find(msg => msg.messageId === messageId);
    const msgIndex = channel.messages.findIndex(msg => msg.messageId === messageId);
    if (message.uId === authUser.uId || channel.ownerMembers.find((s) => s.uId === authUser.uId) !== undefined || authUser.uId === 0) {
      channel.messages.splice(msgIndex, 1);
      data.numMsgs--;
      updateWorkplaceMessagesStats();
      return {};
    } else {
      throw HTTPError(FORBIDDEN, "Can not delete other user's messages");
    }
  }

  throw HTTPError(BAD_REQUEST, `Message ${messageId} does not exist!`);
}

/**
 * Sends a message from a dm member to the dm.
 * Returns the id of the sent message or error.
 * @param {string} token token of authorised user
 * @param {number} dmId Id of channel
 * @param {string} message user message
 * @returns {MessageId} id of message
 * @returns {ERROR} error message
 */
export function sendDmV2(token: string, dmId: number, message: string): MessageId {
  const authUser = getUserFromToken(token);
  const dm = getDm(dmId);

  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (dm === null) {
    throw HTTPError(BAD_REQUEST, `Dm ${dmId} does not exist!`);
  }

  if (message.length < LOWERLIMIT || message.length > UPPERLIMIT) {
    throw HTTPError(BAD_REQUEST, 'Your message is not the accepted length!');
  }

  let isDMMember = false;
  for (const member of dm.members) {
    if (member === authUser.uId) {
      isDMMember = true;
      break;
    }
  }

  if (!isDMMember) {
    throw HTTPError(FORBIDDEN, `Authorised User (${authUser.uId}) is not a member of dm (${dmId})`);
  }

  const messageId = getNextMessageId(false);
  const seconds = Math.floor((new Date()).getTime() / 1000);
  const messageObject: Message = {
    messageId: messageId,
    uId: authUser.uId,
    message: message,
    timeSent: seconds,
    isPinned: false,
    reacts: []
  };

  dm.messages.unshift(messageObject);

  const handles = extractHandles(message);
  if (handles.length > 0) {
    let notifiedUser: User;
    for (const handle of handles) {
      notifiedUser = getUserFromHandle(handle);
      if (notifiedUser !== null && isMember(dm.dmId, notifiedUser.uId, false)) {
        notifiedUser.notifications.unshift({
          channelId: -1,
          dmId: dm.dmId,
          notificationMessage: `${authUser.handleStr} tagged you in ${dm.name}: ${message.substring(0, NOTIFICATION_MESSAGE)}`
        });
      }
    }
  }

  const dataStore = getData();
  dataStore.numMsgs++;
  updateWorkplaceMessagesStats();
  updateUserMessageSent(authUser.uId);

  return {
    messageId: messageId
  };
}

// Pins a message
/**
* @param {string} token token of an authorised user
* @param { MessageId } messageId id of a valid message
*/
export function messagePinV1(token: string, messageId: number) {
  const user = getUserFromToken(token);
  const channelMessage = getChannelMessage(messageId);
  const dmMessage = getDmMessage(messageId);
  let isChannel = false;

  if (user === null) {
    throw HTTPError(FORBIDDEN, `User with token (${token}) doesn't exist`);
  }

  if (channelMessage !== null) {
    const channelMember = channelMessage.channel.allMembers.find(member => member.uId === user.uId);
    if (channelMember === undefined) {
      throw HTTPError(BAD_REQUEST, 'you are not a part of this channel that has this message');
    }
    if (channelMessage.message.isPinned === true) {
      throw HTTPError(BAD_REQUEST, 'Message is already pinned');
    }
    isChannel = true;
  } else if (dmMessage !== null) {
    const dmMember = dmMessage.dm.members.find(member => member === user.uId);
    if (dmMember === undefined) {
      throw HTTPError(BAD_REQUEST, 'you are not a part of this dm that has the message');
    }
    if (dmMessage.message.isPinned === true) {
      throw HTTPError(BAD_REQUEST, 'Message is already pinned');
    }
  } else {
    throw HTTPError(BAD_REQUEST, 'messageId is not valid as a dm or a channel message id');
  }

  if (isChannel) {
    // check owner
    const channelOwner = channelMessage.channel.ownerMembers.find(member => member.uId === user.uId) !== undefined || isGlobalOwner(user.uId);
    if (channelOwner) {
      channelMessage.message.isPinned = true;
    } else {
      throw HTTPError(FORBIDDEN, 'User is not a channel owner or the global owner');
    }
  } else {
    // check owner
    if (dmMessage.dm.owner === user.uId) {
      dmMessage.message.isPinned = true;
    } else {
      throw HTTPError(FORBIDDEN, 'User is not dm owner (creator)');
    }
  }

  return {};
}

// Unpins a message
/**
* @param {string} token token of an authorised user
* @param { number } messageId id of a valid message
*/
export function messageUnpinV1(token: string, messageId: number) {
  const user = getUserFromToken(token);
  const channelMessage = getChannelMessage(messageId);
  const dmMessage = getDmMessage(messageId);
  let isChannel = false;

  if (user === null) {
    throw HTTPError(FORBIDDEN, `User with token (${token}) doesn't exist`);
  }

  if (channelMessage !== null) {
    const channelMember = channelMessage.channel.allMembers.find(member => member.uId === user.uId);
    if (channelMember === undefined) {
      throw HTTPError(BAD_REQUEST, 'you are not a part of this channel that has this message');
    }
    if (channelMessage.message.isPinned === false) {
      throw HTTPError(BAD_REQUEST, 'Message is not pinned');
    }
    isChannel = true;
  } else if (dmMessage !== null) {
    const dmMember = dmMessage.dm.members.find(member => member === user.uId);
    if (dmMember === undefined) {
      throw HTTPError(BAD_REQUEST, 'you are not a part of this dm that has the message');
    }
    if (dmMessage.message.isPinned === false) {
      throw HTTPError(BAD_REQUEST, 'Message is not pinned');
    }
  } else {
    throw HTTPError(BAD_REQUEST, 'messageId is not valid as a dm or a channel message id');
  }

  if (isChannel) {
    // check owner
    const channelOwner = channelMessage.channel.ownerMembers.find(member => member.uId === user.uId) !== undefined || isGlobalOwner(user.uId);
    if (channelOwner) {
      channelMessage.message.isPinned = false;
    } else {
      throw HTTPError(FORBIDDEN, 'User is not a channel owner or the global owner');
    }
  } else {
    // check owner
    if (dmMessage.dm.owner === user.uId) {
      dmMessage.message.isPinned = false;
    } else {
      throw HTTPError(FORBIDDEN, 'User is not dm owner (creator)');
    }
  }

  return {};
}

// Reacts to a message
/**
* @param {string} token token of an authorised user
* @param { number} messageId id of a valid message
* @param { number } reactId id of a valid message
*/
export function messageReactV1(token: string, messageId: number, reactId: number) {
  const user = getUserFromToken(token);
  const channelMessage = getChannelMessage(messageId);
  const dmMessage = getDmMessage(messageId);
  const validReactIds = [1];
  let isChannel = false;

  if (user === null) {
    throw HTTPError(FORBIDDEN, `User with token (${token}) doesn't exist`);
  }

  if (validReactIds.find(id => id === reactId) === undefined) {
    throw HTTPError(BAD_REQUEST, `react with reactId (${reactId}) is invalid`);
  }

  if (channelMessage !== null) {
    isChannel = true;
    const channelMember = channelMessage.channel.allMembers.find(member => member.uId === user.uId);
    if (channelMember === undefined) {
      throw HTTPError(BAD_REQUEST, 'you are not a part of this channel that has this message');
    }
    for (const react of channelMessage.message.reacts) {
      if (react.reactId === reactId && react.uIds.find(uId => uId === user.uId) !== undefined) {
        throw HTTPError(BAD_REQUEST, 'User has already made this reaction to this message!');
      }
    }
  } else if (dmMessage !== null) {
    const dmMember = dmMessage.dm.members.find(member => member === user.uId);
    if (dmMember === undefined) {
      throw HTTPError(BAD_REQUEST, 'you are not a part of this dm that has the message');
    }
    for (const react of dmMessage.message.reacts) {
      if (react.reactId === reactId && react.uIds.find(uId => uId === user.uId) !== undefined) {
        throw HTTPError(BAD_REQUEST, 'User has already made this reaction to this message!');
      }
    }
  } else {
    throw HTTPError(BAD_REQUEST, 'messageId is not valid as a dm or a channel message id');
  }

  const newReact: React = {
    reactId: reactId,
    uIds: [user.uId],
    isThisUserReacted: false,
  };
  let notifiedUser;
  if (isChannel) {
    notifiedUser = getUser(channelMessage.message.uId);
    const channelReactToUpdate = channelMessage.message.reacts.find(react => react.reactId === reactId);
    if (channelReactToUpdate !== undefined) {
      channelReactToUpdate.uIds.push(user.uId);
    } else {
      channelMessage.message.reacts.push(newReact);
    }
    if (isMember(channelMessage.channel.channelId, notifiedUser.uId, true)) {
      notifiedUser.notifications.unshift({
        channelId: channelMessage.channel.channelId,
        dmId: -1,
        notificationMessage: `${user.handleStr} reacted to your message in ${channelMessage.channel.name}`
      });
    }
  } else {
    notifiedUser = getUser(dmMessage.message.uId);
    const dmReactToUpdate = dmMessage.message.reacts.find(react => react.reactId === reactId);
    if (dmReactToUpdate !== undefined) {
      dmReactToUpdate.uIds.push(user.uId);
    } else {
      dmMessage.message.reacts.push(newReact);
    }
    if (isMember(dmMessage.dm.dmId, notifiedUser.uId, false)) {
      notifiedUser.notifications.unshift({
        channelId: -1,
        dmId: dmMessage.dm.dmId,
        notificationMessage: `${user.handleStr} reacted to your message in ${dmMessage.dm.name}`
      });
    }
  }

  return {};
}

// Unreacts to a message
/**
* @param {string} token token of an authorised user
* @param { number} messageId id of a valid message
* @param { number } reactId id of a valid message
*/
export function messageUnreactV1(token: string, messageId: number, reactId: number) {
  const user = getUserFromToken(token);
  const channelMessage = getChannelMessage(messageId);
  const dmMessage = getDmMessage(messageId);
  const validReactIds = [1];
  let isChannel = false;

  if (user === null) {
    throw HTTPError(FORBIDDEN, `User with token (${token}) doesn't exist`);
  }

  if (validReactIds.find(id => id === reactId) === undefined) {
    throw HTTPError(BAD_REQUEST, `react with reactId (${reactId}) is invalid`);
  }

  let reactExists = false;
  if (channelMessage !== null) {
    isChannel = true;
    const channelMember = channelMessage.channel.allMembers.find(member => member.uId === user.uId);
    if (channelMember === undefined) {
      throw HTTPError(BAD_REQUEST, 'you are not a part of this channel that has this message');
    }
    for (const react of channelMessage.message.reacts) {
      if (react.reactId === reactId && react.uIds.find(uId => uId === user.uId) !== undefined) {
        reactExists = true;
      }
    }
  } else if (dmMessage !== null) {
    const dmMember = dmMessage.dm.members.find(member => member === user.uId);
    if (dmMember === undefined) {
      throw HTTPError(400, 'you are not a part of this dm that has the message');
    }
    for (const react of dmMessage.message.reacts) {
      if (react.reactId === reactId && react.uIds.find(uId => uId === user.uId) !== undefined) {
        reactExists = true;
      }
    }
  } else {
    throw HTTPError(BAD_REQUEST, 'messageId is not valid as a dm or a channel message id');
  }

  if (reactExists === false) {
    throw HTTPError(BAD_REQUEST, 'user has not reacted to this message');
  }

  if (isChannel) {
    const channelReactToRemove = channelMessage.message.reacts.find(react => react.reactId === reactId);
    if (channelReactToRemove.uIds.length === 1) {
      channelMessage.message.reacts.splice(channelMessage.message.reacts.indexOf(channelReactToRemove), 1);
    } else {
      channelReactToRemove.uIds.splice(channelReactToRemove.uIds.indexOf(channelReactToRemove.uIds.find(id => id === user.uId)), 1);
    }
  } else {
    const dmReactToRemove = dmMessage.message.reacts.find(react => react.reactId === reactId);
    if (dmReactToRemove.uIds.length === 1) {
      dmMessage.message.reacts.splice(dmMessage.message.reacts.indexOf(dmReactToRemove), 1);
    } else {
      dmReactToRemove.uIds.splice(dmReactToRemove.uIds.indexOf(dmReactToRemove.uIds.find(id => id === user.uId)), 1);
    }
  }
  return {};
}

// Shares a message with an optional additional message to a channel/dm.
// Throws error with appropriate status code or returns the sharedMessage's id.
/**
 * @param {string} token token of authorised user
 * @param {number} ogMessageId Id of message
 * @param {string} message user message
 * @param {number} channelId Id of channel
 * @param {number} dmId Id of dm
 * @returns {SharedMessageId} id of shared message
 */
export function messageShareV1(token: string, ogMessageId: number, message: string, channelId: number, dmId: number): SharedMessageId {
  const channel = getChannel(channelId);
  const dm = getDm(dmId);
  const user = getUserFromToken(token);
  const channelMessage = getChannelMessage(ogMessageId);
  const dmMessage = getDmMessage(ogMessageId);
  let isChannel = false;
  let isChannelMessage = false;
  if (user === null) {
    throw HTTPError(FORBIDDEN, `User with token (${token}) doesn't exist`);
  }
  if (channelId !== -1 && dmId !== -1) {
    throw HTTPError(BAD_REQUEST, 'channel/dmId must be -1!');
  }
  if (message.length > UPPERLIMIT) {
    throw HTTPError(BAD_REQUEST, 'message is over expected limit');
  }
  if (channel === null && dm === null) {
    throw HTTPError(BAD_REQUEST, 'both channel and dm are invalid!');
  }
  // checks if ogMessageId exists and if the user is part of the dm/channel that it was sent in.
  if ((channelMessage === null && dmMessage === null)) {
    throw HTTPError(BAD_REQUEST, `message with id ${ogMessageId} does not exist`);
  }
  if (channelMessage !== null) {
    const channelMember = channelMessage.channel.allMembers.find(member => member.uId === user.uId);
    if (channelMember === undefined) {
      throw HTTPError(BAD_REQUEST, 'you are not a part of this channel that has the ogmessage');
    }
    isChannelMessage = true;
  } else {
    const dmMember = dmMessage.dm.members.find(member => member === user.uId);
    if (dmMember === undefined) {
      throw HTTPError(BAD_REQUEST, 'you are not a part of this dm that has the ogmessage');
    }
  }
  if (channelId !== -1) {
    if (isMember(channelId, user.uId, true) === false) {
      throw HTTPError(FORBIDDEN, 'you are not part of this channel!');
    }
    isChannel = true;
  }
  if (dmId !== -1 && isMember(dmId, user.uId, false) === false) {
    throw HTTPError(FORBIDDEN, 'you are not part of this dm!');
  }

  let newMessage;
  if (isChannelMessage) {
    newMessage = channelMessage.message.message;
  } else {
    newMessage = dmMessage.message.message;
  }
  if (message.length > 0) {
    newMessage = newMessage + ' ' + message;
  }

  const messageId = getNextMessageId(false);
  const seconds = Math.floor((new Date()).getTime() / 1000);
  const messageObject: Message = {
    messageId: messageId,
    uId: user.uId,
    message: newMessage,
    timeSent: seconds,
    isPinned: false,
    reacts: []
  };

  const handles = extractHandles(message);
  if (isChannel) {
    channel.messages.unshift(messageObject);
    if (handles.length > 0) {
      let notifiedUser: User;
      for (const handle of handles) {
        notifiedUser = getUserFromHandle(handle);
        if (notifiedUser !== null && isMember(channelId, notifiedUser.uId, true)) {
          notifiedUser.notifications.unshift({
            channelId: channel.channelId,
            dmId: -1,
            notificationMessage: `${user.handleStr} tagged you in ${channel.name}: ${newMessage.substring(0, NOTIFICATION_MESSAGE)}`
          });
        }
      }
    }
  } else {
    dm.messages.unshift(messageObject);
    if (handles.length > 0) {
      let notifiedUser: User;
      for (const handle of handles) {
        notifiedUser = getUserFromHandle(handle);
        if (notifiedUser !== null && isMember(dm.dmId, notifiedUser.uId, false)) {
          notifiedUser.notifications.unshift({
            channelId: -1,
            dmId: dm.dmId,
            notificationMessage: `${user.handleStr} tagged you in ${dm.name}: ${newMessage.substring(0, NOTIFICATION_MESSAGE)}`
          });
        }
      }
    }
  }

  return {
    sharedMessageId: messageId
  };
}
// Finds all messages that contains a string
// Returns a an array of objects which is all found messages.
/**
 *
 * @param {string} token token of authorised user
 * @param {string} queryStr string to search for
 * @returns {messages} all found messages
 */
export function searchV1(token: string, queryStr: string) {
  const authUser = getUserFromToken(token);
  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (queryStr.length === 0 || queryStr.length > 1000) {
    throw HTTPError(BAD_REQUEST, `Query String ${queryStr} invalid length`);
  }

  const data = getData();
  const tempData = data;
  const messages = [];
  const dm = tempData.dms.find(dm => dm.messages.some(msg => msg.message.toLowerCase().includes(queryStr.toLowerCase()) === true));
  if (dm !== undefined) {
    let message = dm.messages.find(msg => msg.message.toLowerCase().includes(queryStr.toLowerCase()) === true);
    while (message !== undefined) {
      const msgIndex = dm.messages.findIndex(msg => msg.message.toLowerCase().includes(queryStr.toLowerCase()) === true);
      messages.push(message);
      dm.messages.splice(msgIndex, 1);
      message = dm.messages.find(msg => msg.message.toLowerCase().includes(queryStr.toLowerCase()) === true);
    }
  }

  const channel = tempData.channels.find(channel => channel.messages.some(msg => msg.message.toLowerCase().includes(queryStr.toLowerCase()) === true));
  if (channel !== undefined) {
    let message = channel.messages.find(msg => msg.message.toLowerCase().includes(queryStr.toLowerCase()) === true);
    while (message !== undefined) {
      const msgIndex = channel.messages.findIndex(msg => msg.message.toLowerCase().includes(queryStr.toLowerCase()) === true);
      messages.push(message);
      channel.messages.splice(msgIndex, 1);
      message = channel.messages.find(msg => msg.message.toLowerCase().includes(queryStr.toLowerCase()) === true);
    }
  }
  return { messages };
}

/**
 * Sends a message to a channel after a specified time.
 * Returns the id of the sent message or error.
 * @param {string} token token of authorised user
 * @param {number} channelId Id of channel
 * @param {string} message user message
 * @param {Number} timeSent time in seconds
 * @returns {MessageId} id of message
 */
export function messageSendLaterV1(token: string, channelId: number, message: string, timeSent: number): MessageId {
  const authUser = getUserFromToken(token);
  const channel = getChannel(channelId);

  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (channel === null) {
    throw HTTPError(BAD_REQUEST, `Channel ${channelId} does not exist!`);
  }

  if (!isMember(channelId, authUser.uId, true)) {
    throw HTTPError(FORBIDDEN, 'you are not part of this channel!');
  }

  if (message.length < LOWERLIMIT || message.length > UPPERLIMIT) {
    throw HTTPError(BAD_REQUEST, 'Your message is not the accepted length!');
  }

  const timeNow = Math.floor((new Date()).getTime() / MS);
  if (timeSent < timeNow) {
    throw HTTPError(BAD_REQUEST, 'message cannot be sent in the past!');
  }

  const delay = (timeSent - timeNow) * MS;
  const messageId = getNextMessageId(true);
  const messageObject: Message = {
    messageId: messageId,
    uId: authUser.uId,
    message: message,
    timeSent: timeSent,
    isPinned: false,
    reacts: []
  };

  const handles = extractHandles(message);
  setTimeout(() => {
    channel.messages.unshift(messageObject);
    if (handles.length > 0) {
      let notifiedUser: User;
      for (const handle of handles) {
        notifiedUser = getUserFromHandle(handle);
        if (notifiedUser !== null && isMember(channel.channelId, notifiedUser.uId, true)) {
          notifiedUser.notifications.unshift({
            channelId: channel.channelId,
            dmId: -1,
            notificationMessage: `${authUser.handleStr} tagged you in ${channel.name}: ${message.substring(0, NOTIFICATION_MESSAGE)}`
          });
        }
      }
    }
  }, delay);

  const dataStore = getData();
  dataStore.numMsgs++;
  updateWorkplaceMessagesStats();
  updateUserMessageSent(authUser.uId);

  return {
    messageId: messageId
  };
}

/**
 * Sends a message to a dm after a specified time.
 * Returns the id of the sent message or error.
 * @param {string} token token of authorised user
 * @param {number} dmId Id of dm
 * @param {string} message user message
 * @param {Number} timeSent time in seconds
 * @returns {MessageId} id of message
 */
export function messageSendLaterDmV1(token: string, dmId: number, message: string, timeSent: number): MessageId {
  const authUser = getUserFromToken(token);
  const dm = getDm(dmId);

  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (dm === null) {
    throw HTTPError(BAD_REQUEST, `dm ${dmId} does not exist!`);
  }

  if (!isMember(dmId, authUser.uId, false)) {
    throw HTTPError(FORBIDDEN, 'you are not part of this channel!');
  }

  if (message.length < LOWERLIMIT || message.length > UPPERLIMIT) {
    throw HTTPError(BAD_REQUEST, 'Your message is not the accepted length!');
  }

  const timeNow = Math.floor((new Date()).getTime() / MS);
  if (timeSent < timeNow) {
    throw HTTPError(BAD_REQUEST, 'message cannot be sent in the past!');
  }

  const delay = (timeSent - timeNow) * MS;
  const messageId = getNextMessageId(true);
  const messageObject: Message = {
    messageId: messageId,
    uId: authUser.uId,
    message: message,
    timeSent: timeSent,
    isPinned: false,
    reacts: []
  };

  const handles = extractHandles(message);
  setTimeout(() => {
    const dmExists = getDm(dmId);
    if (dmExists !== null) {
      dm.messages.unshift(messageObject);
      if (handles.length > 0) {
        let notifiedUser: User;
        for (const handle of handles) {
          notifiedUser = getUserFromHandle(handle);
          if (notifiedUser !== null && isMember(dm.dmId, notifiedUser.uId, false)) {
            notifiedUser.notifications.unshift({
              channelId: -1,
              dmId: dm.dmId,
              notificationMessage: `${authUser.handleStr} tagged you in ${dm.name}: ${message.substring(0, NOTIFICATION_MESSAGE)}`
            });
          }
        }
      }
    }
  }, delay);

  const dataStore = getData();
  dataStore.numMsgs++;
  updateWorkplaceMessagesStats();
  updateUserMessageSent(authUser.uId);

  return {
    messageId: messageId
  };
}
