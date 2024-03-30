import {
  reqAuthRegisterV3,
  reqChannelsCreateV3,
  reqChannelJoinV3,
  reqMessageSendV2,
  reqDmCreateV2,
  reqDmRemoveV2,
  reqChannelMessagesV3,
  reqDmMessagesV2,
  reqMessageSendDmV2,
  reqMessagePinV1,
  reqMessageUnpinV1,
  reqMessageReactV1,
  reqMessageUnreactV1,
  reqMessageShareV1,
  reqMessageSendLaterV1,
  reqMessageSendLaterDmV1,
  reqClearV1,
} from '../src/requestHelpers';

import { BAD_REQUEST, FORBIDDEN } from '../src/httpsConsts';

import { MessageId } from '../src/types/message';
import type { DmCreateObject } from '../src/types/dm';
type USERID = { authUserId: number, token: string }
type CHANNELID = { channelId: number }
// const messageId = { messageId: expect.any(Number) };

// Delay length of sendlater and similar
const DELAY_LENGTH = 2;
const TIMEOUT_DELAY = 4000;

const sleepSync = (ms: number) => {
  const end = new Date().getTime() + ms;
  while (new Date().getTime() < end) { /* do nothing */ }
};

beforeEach(() => {
  reqClearV1();
});

describe('/message/share/v1', () => {
  let user1: USERID, user2: USERID;
  let userId1: USERID, userId2: USERID;
  let channel1: CHANNELID;
  let channelId1: number;
  let message1: MessageId, message2: MessageId;
  let messageId1: number, messageId2: number;
  let dm1: DmCreateObject;
  let dmId1: number;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
    user2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
    if ('authUserId' in user1 && 'authUserId' in user2) {
      userId1 = user1;
      userId2 = user2;
    }
    channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
    if ('channelId' in channel1) {
      channelId1 = channel1.channelId;
    }
    dm1 = reqDmCreateV2(userId1.token, [userId2.authUserId]);
    if ('dmId' in dm1) {
      dmId1 = dm1.dmId;
    }
    message1 = reqMessageSendV2(userId1.token, channelId1, 'Hello World!');
    message2 = reqMessageSendDmV2(userId1.token, dmId1, 'Hey!');
    if ('messageId' in message1 && 'messageId' in message2) {
      messageId1 = message1.messageId;
      messageId2 = message2.messageId;
    }
  });

  describe('Invalid Parameters', () => {
    test('Invalid user token', () => {
      expect(reqMessageShareV1('Random', messageId1, '', -1, dmId1)).toEqual(FORBIDDEN);
    });
    test('Invalid channel and dm ids', () => {
      expect(reqMessageShareV1(userId1.token, messageId1, '', -1, dmId1 + 1)).toEqual(BAD_REQUEST);
    });
    test('both channel and dm ids are not -1', () => {
      expect(reqMessageShareV1(userId1.token, messageId1, '', channelId1, dmId1)).toEqual(BAD_REQUEST);
    });
    test('message length > 1000 characters', () => {
      const newMessage = 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked. What s happened to me? he thought. It wasn t a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the house';
      expect(reqMessageShareV1(userId1.token, messageId1, newMessage, -1, dmId1)).toEqual(BAD_REQUEST);
    });
    test('invalid messageId', () => {
      expect(reqMessageShareV1(userId1.token, messageId1 + 5, '', -1, dmId1)).toEqual(BAD_REQUEST);
    });
    test('user trying to send message to unjoined channel', () => {
      expect(reqMessageShareV1(userId2.token, messageId2, '', channelId1, -1)).toEqual(FORBIDDEN);
    });
    test('user trying to send message to unjoined dm', () => {
      const user3 = reqAuthRegisterV3('gamer@gmail.com', 'password54672', 'Finn', 'Walker');
      const dm2 = reqDmCreateV2(userId2.token, [user3.authUserId]);
      expect(reqMessageShareV1(userId1.token, messageId2, '', -1, dm2.dmId)).toEqual(FORBIDDEN);
    });
    test('valid message was sent in channel that user is not part of', () => {
      expect(reqMessageShareV1(userId2.token, messageId1, '', -1, dmId1)).toEqual(BAD_REQUEST);
    });
    test('valid message was sent in dm that user is not part of', () => {
      const user3 = reqAuthRegisterV3('gamer@gmail.com', 'password54672', 'Finn', 'Walker');
      const dm2 = reqDmCreateV2(userId2.token, [user3.authUserId]);
      const message3 = reqMessageSendDmV2(userId2.token, dm2.dmId, 'Random');
      expect(reqMessageShareV1(userId1.token, message3.messageId, '', -1, dmId1)).toEqual(BAD_REQUEST);
    });
  });

  describe('Valid Parameters', () => {
    test('valid channel message shared to dm', () => {
      expect(reqMessageShareV1(userId1.token, messageId1, '', -1, dmId1)).toEqual({
        sharedMessageId: 2
      });
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 2,
            uId: userId1.authUserId,
            message: 'Hello World!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: messageId2,
            uId: userId1.authUserId,
            message: 'Hey!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('valid dm message shared to channel', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      expect(reqMessageShareV1(userId2.token, messageId2, '', channelId1, -1)).toEqual({
        sharedMessageId: 2
      });
      expect(reqChannelMessagesV3(userId1.token, channelId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 2,
            uId: userId2.authUserId,
            message: 'Hey!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: messageId1,
            uId: userId1.authUserId,
            message: 'Hello World!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('message shared with optional message', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      expect(reqMessageShareV1(userId2.token, messageId2, 'How are you doing?', channelId1, -1)).toEqual({
        sharedMessageId: 2
      });
      expect(reqChannelMessagesV3(userId1.token, channelId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 2,
            uId: userId2.authUserId,
            message: 'Hey! How are you doing?',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: messageId1,
            uId: userId1.authUserId,
            message: 'Hello World!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('message shared to multiple channels and dms', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      const user3 = reqAuthRegisterV3('gamer@gmail.com', 'password54672', 'Finn', 'Walker');
      const dm2 = reqDmCreateV2(userId2.token, [user3.authUserId]);
      const message3 = reqMessageSendDmV2(userId2.token, dm2.dmId, 'Random');
      expect(reqMessageShareV1(userId2.token, message3.messageId, '', -1, dmId1)).toEqual({
        sharedMessageId: 3
      });
      reqChannelJoinV3(user3.token, channelId1);
      const message4 = reqMessageSendDmV2(user3.token, dm2.dmId, 'Thoughts on pineapple on pizza?');
      const message5 = reqMessageShareV1(user3.token, message4.messageId, 'everyone', channelId1, -1);
      expect(message5).toEqual({
        sharedMessageId: 5
      });
      expect(reqMessageShareV1(userId2.token, message5.sharedMessageId, 'surely not :(', -1, dmId1)).toEqual({
        sharedMessageId: 6
      });
      expect(reqChannelMessagesV3(user3.token, channelId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 5,
            uId: user3.authUserId,
            message: 'Thoughts on pineapple on pizza? everyone',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: messageId1,
            uId: userId1.authUserId,
            message: 'Hello World!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 6,
            uId: userId2.authUserId,
            message: 'Thoughts on pineapple on pizza? everyone surely not :(',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: 3,
            uId: userId2.authUserId,
            message: 'Random',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: messageId2,
            uId: userId1.authUserId,
            message: 'Hey!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
  });
});

describe('/message/pin/v1', () => {
  let user1: USERID, user2: USERID;
  let userId1: USERID, userId2: USERID;
  let channel1: CHANNELID, channel2: CHANNELID;
  let channelId1: number, channelId2: number;
  let message1: MessageId, message2: MessageId, message3: MessageId;
  let messageId1: number, messageId2: number, messageId3: number;
  let dm1: DmCreateObject;
  let dmId1: number;

  describe('Invalid Cases', () => {
    test('Invalid Input', () => {
      userId1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');

      channelId1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true).channelId;
      messageId1 = reqMessageSendV2(userId1.token, channelId1, 'Hello World! In channel 1!').messageId;

      channelId2 = reqChannelsCreateV3(userId2.token, 'COMP1541', true).channelId;
      messageId2 = reqMessageSendV2(userId2.token, channelId2, 'Hello World! In channel 2!').messageId;

      dmId1 = reqDmCreateV2(userId1.token, [userId2.authUserId]).dmId;
      messageId3 = reqMessageSendDmV2(userId1.token, dmId1, 'Hey!').messageId;

      // As fail cases won't modify the data, we can save runtime by doing them all in the same test
      // Invalid Token
      expect(reqMessagePinV1('Invalid Token', messageId1)).toStrictEqual(FORBIDDEN);
      // Message does not exist
      expect(reqMessagePinV1(userId1.token, messageId1 + 5)).toStrictEqual(BAD_REQUEST);
      // User not part of channel
      expect(reqMessagePinV1(userId1.token, messageId2)).toStrictEqual(BAD_REQUEST);
      // User not part of DM
      const user3 = reqAuthRegisterV3('generic2@hotmail.com', 'Strikerr', 'Brucey', 'Wayney');
      expect(reqMessagePinV1(user3.token, messageId3)).toStrictEqual(BAD_REQUEST);
      // Message Already Pinned
      reqMessagePinV1(userId2.token, messageId2);
      expect(reqMessagePinV1(userId2.token, messageId2)).toStrictEqual(BAD_REQUEST);
      // DM Message Already pinned
      reqMessagePinV1(userId1.token, messageId3);
      expect(reqMessagePinV1(userId1.token, messageId3)).toStrictEqual(BAD_REQUEST);
      // User not an owner (Channel)
      reqChannelJoinV3(userId2.token, channelId1);
      expect(reqMessagePinV1(userId2.token, messageId1)).toStrictEqual(FORBIDDEN);
      // User not an owner (DM)
      reqMessageUnpinV1(userId1.token, messageId3);
      expect(reqMessagePinV1(userId2.token, messageId3)).toStrictEqual(FORBIDDEN);
    });
  });

  describe('Valid cases', () => {
    test('Standard Owner pins a Message in a Channel', () => {
      userId1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
      channelId2 = reqChannelsCreateV3(userId2.token, 'COMP1541', true).channelId;
      messageId2 = reqMessageSendV2(userId2.token, channelId2, 'Hello World! In channel 2!').messageId;
      reqMessagePinV1(userId2.token, messageId2);
      expect(reqChannelMessagesV3(userId2.token, channelId2, 0)).toStrictEqual({
        messages: [
          {
            messageId: messageId2,
            uId: userId2.authUserId,
            message: 'Hello World! In channel 2!',
            timeSent: expect.any(Number),
            isPinned: true,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('Global Owner pins a Message in a Channel', () => {
      userId1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
      channelId2 = reqChannelsCreateV3(userId2.token, 'COMP1541', true).channelId;
      messageId2 = reqMessageSendV2(userId2.token, channelId2, 'Hello World! In channel 2!').messageId;
      reqChannelJoinV3(userId1.token, channelId2);
      reqMessagePinV1(userId1.token, messageId2);
      expect(reqChannelMessagesV3(userId1.token, channelId2, 0)).toStrictEqual({
        messages: [
          {
            messageId: messageId2,
            uId: userId2.authUserId,
            message: 'Hello World! In channel 2!',
            timeSent: expect.any(Number),
            isPinned: true,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('Standard Owner pins a Message in a DM', () => {
      userId1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
      dmId1 = reqDmCreateV2(userId1.token, [userId2.authUserId]).dmId;
      messageId3 = reqMessageSendDmV2(userId1.token, dmId1, 'Hey!').messageId;
      reqMessagePinV1(userId1.token, messageId3);
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: messageId3,
            uId: userId1.authUserId,
            message: 'Hey!',
            timeSent: expect.any(Number),
            isPinned: true,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
  });
});

// This bit of code is a bit weirdly written, in order to speed it up enough
// that our tests complete within 2.5 minutes
describe('/message/unpin/v1', () => {
  let user1: USERID, user2: USERID;
  let userId1: USERID, userId2: USERID;
  let channel1: CHANNELID, channel2: CHANNELID;
  let channelId1: number, channelId2: number;
  let message1: MessageId, message2: MessageId, message3: MessageId;
  let messageId1: number, messageId2: number, messageId3: number;
  let dm1: DmCreateObject;
  let dmId1: number;

  describe('Invalid Cases', () => {
    test('Invalid Input', () => {
      userId1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');

      channelId1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true).channelId;
      messageId1 = reqMessageSendV2(userId1.token, channelId1, 'Hello World! In channel 1!').messageId;
      reqMessagePinV1(userId1.token, messageId1);

      channelId2 = reqChannelsCreateV3(userId2.token, 'COMP1541', true).channelId;
      messageId2 = reqMessageSendV2(userId2.token, channelId2, 'Hello World! In channel 2!').messageId;
      reqMessagePinV1(userId2.token, messageId2);

      dmId1 = reqDmCreateV2(userId1.token, [userId2.authUserId]).dmId;
      messageId3 = reqMessageSendDmV2(userId1.token, dmId1, 'Hey!').messageId;
      reqMessagePinV1(userId1.token, messageId3);

      const user3 = reqAuthRegisterV3('generic2@hotmail.com', 'Strikerr', 'Brucey', 'Wayney');
      const message4 = reqMessageSendV2(userId1.token, channelId1, 'This is a not pinned message!');
      const message5 = reqMessageSendDmV2(userId1.token, dmId1, 'This is a not pinned message!');

      // As fail cases won't modify the data, we can save runtime by doing them all in the same test
      // Invalid Token
      expect(reqMessageUnpinV1('Invalid Token', messageId1)).toStrictEqual(FORBIDDEN);
      // Message Does Not Exist
      expect(reqMessageUnpinV1(userId1.token, messageId1 + 5)).toStrictEqual(BAD_REQUEST);
      // User not part of channel
      expect(reqMessageUnpinV1(userId1.token, messageId2)).toStrictEqual(BAD_REQUEST);
      // User not part of DM
      expect(reqMessageUnpinV1(user3.token, messageId3)).toStrictEqual(BAD_REQUEST);
      // Message not pinned
      expect(reqMessageUnpinV1(userId1.token, message4.messageId)).toStrictEqual(BAD_REQUEST);
      // DM Message Not Pinned
      expect(reqMessageUnpinV1(userId1.token, message5.messageId)).toStrictEqual(BAD_REQUEST);
      // User not owner in channel
      reqChannelJoinV3(userId2.token, channelId1);
      expect(reqMessageUnpinV1(userId2.token, messageId1)).toStrictEqual(FORBIDDEN);
      // User not owner in DM
      reqMessagePinV1(userId1.token, messageId3);
      expect(reqMessageUnpinV1(userId2.token, messageId3)).toStrictEqual(FORBIDDEN);
    });
  });

  describe('Valid cases', () => {
    test('Standard Owner Unpins a Message in a Channel', () => {
      userId1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
      channelId2 = reqChannelsCreateV3(userId2.token, 'COMP1541', true).channelId;
      messageId2 = reqMessageSendV2(userId2.token, channelId2, 'Hello World! In channel 2!').messageId;
      reqMessagePinV1(userId2.token, messageId2);
      reqMessageUnpinV1(userId2.token, messageId2);
      expect(reqChannelMessagesV3(userId2.token, channelId2, 0)).toStrictEqual({
        messages: [
          {
            messageId: messageId2,
            uId: userId2.authUserId,
            message: 'Hello World! In channel 2!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('Global Owner Unpins a Message in a Channel', () => {
      userId1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
      channelId2 = reqChannelsCreateV3(userId2.token, 'COMP1541', true).channelId;
      messageId2 = reqMessageSendV2(userId2.token, channelId2, 'Hello World! In channel 2!').messageId;
      reqMessagePinV1(userId2.token, messageId2);
      reqChannelJoinV3(userId1.token, channelId2);
      reqMessageUnpinV1(userId1.token, messageId2);
      expect(reqChannelMessagesV3(userId1.token, channelId2, 0)).toStrictEqual({
        messages: [
          {
            messageId: messageId2,
            uId: userId2.authUserId,
            message: 'Hello World! In channel 2!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('Standard Owner Unpins a Message in a DM', () => {
      userId1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
      dmId1 = reqDmCreateV2(userId1.token, [userId2.authUserId]).dmId;
      messageId3 = reqMessageSendDmV2(userId1.token, dmId1, 'Hey!').messageId;
      reqMessagePinV1(userId1.token, messageId3);
      reqMessageUnpinV1(userId1.token, messageId3);
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: messageId3,
            uId: userId1.authUserId,
            message: 'Hey!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
  });
});

describe('/message/react/v1', () => {
  let user1: USERID, user2: USERID;
  let userId1: USERID, userId2: USERID;
  let channel1: CHANNELID, channel2: CHANNELID;
  let channelId1: number, channelId2: number;
  let message1: MessageId, message2: MessageId, message3: MessageId;
  let messageId1: number, messageId2: number, messageId3: number;
  let dm1: DmCreateObject;
  let dmId1: number;
  const validReact = 1;
  const invalidReact = 349;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
    user2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
    if ('authUserId' in user1 && 'authUserId' in user2) {
      userId1 = user1;
      userId2 = user2;
    }
    channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
    if ('channelId' in channel1) {
      channelId1 = channel1.channelId;
    }
    message1 = reqMessageSendV2(userId1.token, channelId1, 'Hello World! In channel 1!');

    channel2 = reqChannelsCreateV3(userId2.token, 'COMP1541', true);
    if ('channelId' in channel2) {
      channelId2 = channel2.channelId;
    }
    message2 = reqMessageSendV2(userId2.token, channelId2, 'Hello World! In channel 2!');

    dm1 = reqDmCreateV2(userId1.token, [userId2.authUserId]);
    if ('dmId' in dm1) {
      dmId1 = dm1.dmId;
    }
    message3 = reqMessageSendDmV2(userId1.token, dmId1, 'Hey!');

    if ('messageId' in message1 && 'messageId' in message2 && 'messageId' in message3) {
      messageId1 = message1.messageId;
      messageId2 = message2.messageId;
      messageId3 = message3.messageId;
    }
  });

  describe('Invalid cases', () => {
    test('Invalid user token', () => {
      expect(reqMessageReactV1('Invalid token', messageId1, validReact)).toStrictEqual(FORBIDDEN);
    });
    test('Invalid react id', () => {
      expect(reqMessageReactV1(userId1.token, messageId1, invalidReact)).toStrictEqual(BAD_REQUEST);
    });
    test('Message is already reacted to in a channel', () => {
      reqMessageReactV1(userId1.token, messageId1, validReact);
      expect(reqMessageReactV1(userId1.token, messageId1, validReact)).toStrictEqual(BAD_REQUEST);
    });
    test('Message is already reacted to in a dm ', () => {
      reqMessageReactV1(userId1.token, messageId3, validReact);
      expect(reqMessageReactV1(userId1.token, messageId3, validReact)).toStrictEqual(BAD_REQUEST);
    });
    test('Message does not exist', () => {
      expect(reqMessageReactV1(userId1.token, messageId1 + 5, validReact)).toStrictEqual(BAD_REQUEST);
    });
    test('Message is valid but user is not part of channel', () => {
      expect(reqMessageReactV1(userId2.token, messageId1, validReact)).toStrictEqual(BAD_REQUEST);
    });
    test('Message is valid but user is not part of dm', () => {
      const user3 = reqAuthRegisterV3('generic2@hotmail.com', 'Strikerr', 'Brucey', 'Wayney');
      expect(reqMessageReactV1(user3.token, messageId3, validReact)).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid cases', () => {
    test('React to a message in a channel', () => {
      reqMessageReactV1(userId2.token, messageId2, validReact);
      expect(reqChannelMessagesV3(userId2.token, channelId2, 0)).toStrictEqual({
        messages: [
          {
            messageId: messageId2,
            uId: userId2.authUserId,
            message: 'Hello World! In channel 2!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: [
              {
                reactId: validReact,
                uIds: [userId2.authUserId],
                isThisUserReacted: true
              }
            ]
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('React to a message in a dm', () => {
      reqMessageReactV1(userId1.token, messageId3, validReact);
      reqMessageReactV1(userId2.token, messageId3, validReact);
      expect(reqDmMessagesV2(userId2.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: messageId3,
            uId: userId1.authUserId,
            message: 'Hey!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: [
              {
                reactId: validReact,
                uIds: [userId1.authUserId, userId2.authUserId],
                isThisUserReacted: true
              }
            ]
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('Test isThisUserReacted variable', () => {
      const message4 = reqMessageSendV2(userId2.token, channelId2, 'This is a second message in channel 2!');
      reqMessageReactV1(userId2.token, messageId2, validReact);
      reqMessageReactV1(userId2.token, message4.messageId, validReact);
      reqChannelJoinV3(userId1.token, channelId2);
      reqMessageReactV1(userId1.token, message4.messageId, validReact);
      expect(reqChannelMessagesV3(userId1.token, channelId2, 0)).toStrictEqual({
        messages: [
          {
            messageId: message4.messageId,
            uId: userId2.authUserId,
            message: 'This is a second message in channel 2!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: [
              {
                reactId: validReact,
                uIds: [userId2.authUserId, userId1.authUserId],
                isThisUserReacted: true
              }
            ]
          },
          {
            messageId: messageId2,
            uId: userId2.authUserId,
            message: 'Hello World! In channel 2!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: [
              {
                reactId: validReact,
                uIds: [userId2.authUserId],
                isThisUserReacted: false
              }
            ]
          }
        ],
        start: 0,
        end: -1,
      });
    });
  });
});

describe('/message/unreact/v1', () => {
  let user1: USERID, user2: USERID;
  let userId1: USERID, userId2: USERID;
  let channel1: CHANNELID, channel2: CHANNELID;
  let channelId1: number, channelId2: number;
  let message1: MessageId, message2: MessageId, message3: MessageId;
  let messageId1: number, messageId2: number, messageId3: number;
  let dm1: DmCreateObject;
  let dmId1: number;
  const validReact = 1;
  const invalidReact = 349;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
    user2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
    if ('authUserId' in user1 && 'authUserId' in user2) {
      userId1 = user1;
      userId2 = user2;
    }
    channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
    if ('channelId' in channel1) {
      channelId1 = channel1.channelId;
    }
    message1 = reqMessageSendV2(userId1.token, channelId1, 'Hello World! In channel 1!');

    channel2 = reqChannelsCreateV3(userId2.token, 'COMP1541', true);
    if ('channelId' in channel2) {
      channelId2 = channel2.channelId;
    }
    message2 = reqMessageSendV2(userId2.token, channelId2, 'Hello World! In channel 2!');

    dm1 = reqDmCreateV2(userId1.token, [userId2.authUserId]);
    if ('dmId' in dm1) {
      dmId1 = dm1.dmId;
    }
    message3 = reqMessageSendDmV2(userId1.token, dmId1, 'Hey!');

    if ('messageId' in message1 && 'messageId' in message2 && 'messageId' in message3) {
      messageId1 = message1.messageId;
      messageId2 = message2.messageId;
      messageId3 = message3.messageId;
    }

    reqMessageReactV1(userId1.token, messageId1, validReact);
    reqMessageReactV1(userId2.token, messageId2, validReact);
    reqMessageReactV1(userId1.token, messageId3, validReact);
  });

  describe('Invalid cases', () => {
    test('Invalid user token', () => {
      expect(reqMessageUnreactV1('Invalid token', messageId1, validReact)).toStrictEqual(FORBIDDEN);
    });
    test('Invalid react id', () => {
      expect(reqMessageUnreactV1(userId1.token, messageId1, invalidReact)).toStrictEqual(BAD_REQUEST);
    });
    test('React does not exist in a channel', () => {
      reqMessageUnreactV1(userId1.token, messageId1, validReact);
      expect(reqMessageUnreactV1(userId1.token, messageId1, validReact)).toStrictEqual(BAD_REQUEST);
    });
    test('React does not exist in a dm ', () => {
      // stopped here
      reqMessageUnreactV1(userId1.token, messageId3, validReact);
      expect(reqMessageUnreactV1(userId1.token, messageId3, validReact)).toStrictEqual(BAD_REQUEST);
    });
    test('Message does not exist', () => {
      expect(reqMessageUnreactV1(userId1.token, messageId1 + 5, validReact)).toStrictEqual(BAD_REQUEST);
    });
    test('Message is valid but user is not part of channel', () => {
      expect(reqMessageUnreactV1(userId2.token, messageId1, validReact)).toStrictEqual(BAD_REQUEST);
    });
    test('Message is valid but user is not part of dm', () => {
      const user3 = reqAuthRegisterV3('generic2@hotmail.com', 'Strikerr', 'Brucey', 'Wayney');
      expect(reqMessageUnreactV1(user3.token, messageId3, validReact)).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid cases', () => {
    test('Unreact to a message in a channel', () => {
      reqChannelJoinV3(userId1.token, channelId2);
      reqMessageReactV1(userId1.token, messageId2, validReact);
      reqMessageUnreactV1(userId1.token, messageId2, validReact);
      reqMessageUnreactV1(userId2.token, messageId2, validReact);
      expect(reqChannelMessagesV3(userId2.token, channelId2, 0)).toStrictEqual({
        messages: [
          {
            messageId: messageId2,
            uId: userId2.authUserId,
            message: 'Hello World! In channel 2!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('Unreact to a message in a dm', () => {
      reqMessageUnreactV1(userId1.token, messageId3, validReact);
      reqMessageReactV1(userId1.token, messageId3, validReact);
      reqMessageReactV1(userId2.token, messageId3, validReact);
      reqMessageUnreactV1(userId1.token, messageId3, validReact);
      expect(reqDmMessagesV2(userId2.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: messageId3,
            uId: userId1.authUserId,
            message: 'Hey!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: [
              {
                reactId: validReact,
                uIds: [userId2.authUserId],
                isThisUserReacted: true
              }
            ]
          }
        ],
        start: 0,
        end: -1,
      });
    });
  });
});

describe('/message/sendlater/v1', () => {
  let user1: USERID, user2: USERID;
  let userId1: USERID, userId2: USERID;
  let channel1: CHANNELID;
  let channelId1: number;
  let timeNow: number;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
    user2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
    if ('authUserId' in user1 && 'authUserId' in user2) {
      userId1 = user1;
      userId2 = user2;
    }
    channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
    if ('channelId' in channel1) {
      channelId1 = channel1.channelId;
    }
  });

  describe('Invalid Cases', () => {
    test('Invalid Cases', () => {
      // Invalid User Token
      timeNow = Math.floor((new Date()).getTime() / 1000);
      expect(reqMessageSendLaterV1('Invalid Token', channelId1, 'hello', timeNow)).toStrictEqual(FORBIDDEN);
      // Invalid channelId
      timeNow = Math.floor((new Date()).getTime() / 1000);
      expect(reqMessageSendLaterV1(userId1.token, channelId1 + 1, 'hello', timeNow)).toStrictEqual(BAD_REQUEST);
      // Invalid message length
      timeNow = Math.floor((new Date()).getTime() / 1000);
      expect(reqMessageSendLaterV1(userId1.token, channelId1, '', timeNow)).toStrictEqual(BAD_REQUEST);
      const longMessage = 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked. What s happened to me? he thought. It wasn t a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the house';
      expect(reqMessageSendLaterV1(userId1.token, channelId1, longMessage, timeNow)).toStrictEqual(BAD_REQUEST);
      // Message sent in the past
      timeNow = Math.floor((new Date()).getTime() / 1000);
      expect(reqMessageSendLaterV1(userId1.token, channelId1, 'hello', -1)).toStrictEqual(BAD_REQUEST);
      expect(reqMessageSendLaterV1(userId1.token, channelId1, 'hello', timeNow - 1)).toStrictEqual(BAD_REQUEST);
      // User not part of channel
      timeNow = Math.floor((new Date()).getTime() / 1000);
      expect(reqMessageSendLaterV1(userId2.token, channelId1, 'hello', timeNow)).toStrictEqual(FORBIDDEN);
    });
  });

  describe('Valid cases', () => {
    test('Sending multiple sendLater messages', () => {
      timeNow = Math.floor((new Date()).getTime() / 1000);
      const delay = timeNow + DELAY_LENGTH;
      reqMessageSendLaterV1(userId1.token, channelId1, 'First', delay);
      const message2 = reqMessageSendV2(userId1.token, channelId1, 'Second');
      const id2 = reqMessageSendLaterV1(userId1.token, channelId1, 'Third', delay + 1);
      expect(id2).toStrictEqual({ messageId: 2 });
      expect(reqChannelMessagesV3(userId1.token, channelId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: message2.messageId,
            uId: userId1.authUserId,
            message: 'Second',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
      sleepSync(TIMEOUT_DELAY);
      expect(reqChannelMessagesV3(userId1.token, channelId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 2,
            uId: userId1.authUserId,
            message: 'Third',
            timeSent: delay + 1,
            isPinned: false,
            reacts: []
          },
          {
            messageId: 0,
            uId: userId1.authUserId,
            message: 'First',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: 1,
            uId: userId1.authUserId,
            message: 'Second',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
  });
});

describe('/message/sendlaterdm/v1', () => {
  let user1: USERID, user2: USERID;
  let userId1: USERID, userId2: USERID;
  let dm1: DmCreateObject;
  let dmId1: number;
  let timeNow: number;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
    user2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
    if ('authUserId' in user1 && 'authUserId' in user2) {
      userId1 = user1;
      userId2 = user2;
    }
    dm1 = reqDmCreateV2(userId1.token, [userId2.authUserId]);
    if ('dmId' in dm1) {
      dmId1 = dm1.dmId;
    }
  });

  describe('Invalid Cases', () => {
    test('Invalid Cases', () => {
      // Invalid User Token
      timeNow = Math.floor((new Date()).getTime() / 1000);
      expect(reqMessageSendLaterDmV1('Invalid Token', dmId1, 'hello', timeNow)).toStrictEqual(FORBIDDEN);
      // Invalid dmId
      timeNow = Math.floor((new Date()).getTime() / 1000);
      expect(reqMessageSendLaterDmV1(userId1.token, dmId1 + 1, 'hello', timeNow)).toStrictEqual(BAD_REQUEST);
      // Invalid Message Length
      timeNow = Math.floor((new Date()).getTime() / 1000);
      expect(reqMessageSendLaterDmV1(userId1.token, dmId1, '', timeNow)).toStrictEqual(BAD_REQUEST);
      const longMessage = 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked. What s happened to me? he thought. It wasn t a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the house';
      expect(reqMessageSendLaterDmV1(userId1.token, dmId1, longMessage, timeNow)).toStrictEqual(BAD_REQUEST);
      // Message sent in the past
      timeNow = Math.floor((new Date()).getTime() / 1000);
      expect(reqMessageSendLaterDmV1(userId1.token, dmId1, 'hello', -1)).toStrictEqual(BAD_REQUEST);
      expect(reqMessageSendLaterDmV1(userId1.token, dmId1, 'hello', timeNow - 1)).toStrictEqual(BAD_REQUEST);
      // User not in dm
      timeNow = Math.floor((new Date()).getTime() / 1000);
      const user3 = reqAuthRegisterV3('generic2@hotmail.com', 'Defender', 'Peter', 'Parker');
      expect(reqMessageSendLaterDmV1(user3.token, dmId1, 'hi', timeNow)).toStrictEqual(FORBIDDEN);
    });
  });

  describe('Valid cases', () => {
    test('dm is removed before message is sent', () => {
      timeNow = Math.floor((new Date()).getTime() / 1000);
      const delay = timeNow + DELAY_LENGTH;
      const id = reqMessageSendLaterDmV1(userId1.token, dmId1, 'hello', delay);
      expect(id).toStrictEqual({ messageId: expect.any(Number) });
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [],
        start: 0,
        end: -1,
      });
      reqDmRemoveV2(userId1.token, dmId1);
      sleepSync(TIMEOUT_DELAY);
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual(BAD_REQUEST);
    });

    test('Sending multiple sendLater messages', () => {
      jest.setTimeout(10000);
      timeNow = Math.floor((new Date()).getTime() / 1000);
      const delay = timeNow + DELAY_LENGTH;
      reqMessageSendLaterDmV1(userId1.token, dmId1, 'First', delay);
      const message2 = reqMessageSendDmV2(userId1.token, dmId1, 'Second');
      const id2 = reqMessageSendLaterDmV1(userId1.token, dmId1, 'Third', delay + 1);
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: message2.messageId,
            uId: userId1.authUserId,
            message: 'Second',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
      sleepSync(TIMEOUT_DELAY);
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 2,
            uId: userId1.authUserId,
            message: 'Third',
            timeSent: delay + 1,
            isPinned: false,
            reacts: []
          },
          {
            messageId: 0,
            uId: userId1.authUserId,
            message: 'First',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: 1,
            uId: userId1.authUserId,
            message: 'Second',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
  });
});