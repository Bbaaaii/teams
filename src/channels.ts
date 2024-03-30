import { getData } from './dataStore';
import { getNextChannelId, getUserFromToken, updateUserChannelStats, updateWorkplaceChannelsStats } from './helper';
import { FORBIDDEN, BAD_REQUEST } from './httpsConsts';
import HTTPError from 'http-errors';

const MAX_CHANNEL_NAME_LENGTH = 20;
const MIN_CHANNEL_NAME_LENGTH = 1;

// type USERID = { authUserId: number }
// type CHANNELID = { channelId: number }
// type NAME = {name: string }
// export type CHANNEL = ({
//   channelId: number,
//   name: string
// });
// type MEMBER = {uId: number};

import { Channel, ChannelId, ChannelsListView } from './types/channel';
import { Message } from './types/message';

/**
 * Creates a channel and returns its id
 * @param {String} token user creating the channel
 * @param {String} name Name of new channel
 * @param {Boolean} isPublic Whether channel is public or not
 * @returns {Object} the new channelId
 */

export function channelsCreateV3(token: string, name: string, isPublic: boolean): ChannelId {
  const dataStore = getData();
  const user = getUserFromToken(token);

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }
  if (name.length > MAX_CHANNEL_NAME_LENGTH || name.length < MIN_CHANNEL_NAME_LENGTH) {
    throw HTTPError(BAD_REQUEST, 'Channel name must be 1-20 characters long');
  }

  const messages: Message[] = [];

  const newChannel: Channel = {
    name: name,
    channelId: getNextChannelId(),
    isPublic: isPublic,
    ownerMembers: [
      {
        uId: user.uId,
      },
    ],
    allMembers: [
      {
        uId: user.uId,
      },
    ],
    messages: messages,
    standup: {
      isActive: false,
      timeFinish: null,
      messageStr: '',
      user: null
    }
  };

  dataStore.channels.push(newChannel);

  dataStore.numChannels++;
  updateWorkplaceChannelsStats();

  updateUserChannelStats(user.uId);

  return { channelId: newChannel.channelId };
}

/**
 *  Returns the list of  channels
 * @param {Number} authUserId
 * @returns {Object}
 */
export function channelsListV3(token: string): ChannelsListView {
  const dataStore = getData();
  const authUserId = getUserFromToken(token);

  if (authUserId === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }

  const output = [];
  for (const channel of dataStore.channels) {
    for (const member of channel.allMembers) {
      if (member.uId === authUserId.uId) {
        output.push({
          channelId: channel.channelId,
          name: channel.name,
        });
      }
    }
  }

  return {
    channels: output,
  };
}

/**
 * Lists all the channels with their id and names
 * @param {String} token token of user requesting the list
 * @returns {Array of Objects} information about each channel
 */
export function channelsListAllV3(token: string): ChannelsListView {
  const dataStore = getData();
  const authUser = getUserFromToken(token);

  if (authUser === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }

  const output = [];
  for (const channels of dataStore.channels) {
    output.push({
      channelId: channels.channelId,
      name: channels.name,
    });
  }
  return { channels: output };
}
