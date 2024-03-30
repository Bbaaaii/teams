import {
  reqAuthRegisterV3,
  reqChannelsCreateV3,
  reqChannelJoinV3,
  reqChannelMessagesV3,
  reqMessageSendV2,
  reqMessageEditV2,
  reqMessageRemoveV2,
  reqDmCreateV2,
  reqDmMessagesV2,
  reqMessageSendDmV2,
  reqMessagePinV1,
  reqSearchV1,
  reqClearV1,
} from '../src/requestHelpers';

import { BAD_REQUEST, FORBIDDEN } from '../src/httpsConsts';
import { MessageId } from '../src/types/message';
import type { DmCreateObject } from '../src/types/dm';
import { Channel } from '../src/types/channel';

type CHANNELID = { channelId: number }
type USERID = { authUserId: number, token: string }
type DMID = { dmId: number };
type MESSAGE = {
  messageId: number;
  uId: number;
  message: string;
  timeSent: number
};

const messageId = { messageId: expect.any(Number) };

beforeEach(() => {
  reqClearV1();
});

describe('/message/send/v2', () => {
  let user1: USERID;
  let userId1: USERID;
  let user2: USERID;
  let userId2: USERID;
  let channel1: CHANNELID;
  let channelId1: number;

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

  describe('Invalid Parameters', () => {
    test('Invalid channelId', () => {
      expect(reqMessageSendV2(userId1.token, channelId1 + 1, 'Hello World!')).toStrictEqual(BAD_REQUEST);
    });
    test('Invalid user token', () => {
      expect(reqMessageSendV2('Random', channelId1, 'Hello World')).toStrictEqual(FORBIDDEN);
    });
    test('user not member of channel', () => {
      expect(reqMessageSendV2(userId2.token, channelId1, 'Hello World!')).toStrictEqual(FORBIDDEN);
    });
    test('empty message', () => {
      expect(reqMessageSendV2(userId1.token, channelId1, '')).toStrictEqual(BAD_REQUEST);
    });
    test('message over 1000 characters', () => {
      const message = 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked. What s happened to me? he thought. It wasn t a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the house';
      expect(reqMessageSendV2(userId1.token, channelId1, message)).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid Parameters', () => {
    test('owner sending message to channel', () => {
      const channelMessage = reqMessageSendV2(userId1.token, channelId1, 'Hello World!');
      expect(channelMessage).toStrictEqual(messageId);
      expect(reqChannelMessagesV3(userId1.token, channelId1, 0)).toStrictEqual({
        messages: [{
          messageId: channelMessage.messageId,
          uId: userId1.authUserId,
          message: 'Hello World!',
          timeSent: expect.any(Number),
          isPinned: false,
          reacts: []
        }],
        start: 0,
        end: -1,
      });
    });

    test('non-owner sending message to channel', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      const channelMessage1 = reqMessageSendV2(userId1.token, channelId1, 'Hello World!');
      const channelMessage2 = reqMessageSendV2(userId2.token, channelId1, 'Second');
      expect(channelMessage2).toStrictEqual(messageId);
      expect(reqChannelMessagesV3(userId1.token, channelId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: channelMessage2.messageId,
            uId: userId2.authUserId,
            message: 'Second',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: channelMessage1.messageId,
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

    test('user sending multiple messages to channel', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      const channelMessage1 = reqMessageSendV2(userId1.token, channelId1, 'Hello World!');
      const channelMessage2 = reqMessageSendV2(userId2.token, channelId1, 'Second');
      const channelMessage3 = reqMessageSendV2(userId2.token, channelId1, 'Third');
      const channelMessage4 = reqMessageSendV2(userId1.token, channelId1, 'Did someone say?');
      expect(channelMessage3).toStrictEqual(messageId);
      expect(channelMessage4).toStrictEqual(messageId);
      expect(reqChannelMessagesV3(userId1.token, channelId1, 1)).toStrictEqual({
        messages: [
          {
            messageId: channelMessage3.messageId,
            uId: userId2.authUserId,
            message: 'Third',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: channelMessage2.messageId,
            uId: userId2.authUserId,
            message: 'Second',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: channelMessage1.messageId,
            uId: userId1.authUserId,
            message: 'Hello World!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
        ],
        start: 1,
        end: -1,
      });
    });
  });
});

describe('/message/edit/v2', () => {
  let user1: USERID;
  let userId1: USERID;
  let user2: USERID;
  let userId2: USERID;
  let channel1: CHANNELID;
  let channelId1: number;
  let message1: MessageId;
  let messageId1: number;
  let message2: MessageId;
  let messageId2: number;
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
    message2 = reqMessageSendDmV2(userId1.token, dmId1, 'Hey!');
    reqChannelJoinV3(userId2.token, channelId1);
    message1 = reqMessageSendV2(userId1.token, channelId1, 'Hello World!');
    if ('messageId' in message1 && 'messageId' in message2) {
      messageId1 = message1.messageId;
      messageId2 = message2.messageId;
    }
  });

  describe('Invalid Parameters', () => {
    test('Invalid user token', () => {
      expect(reqMessageEditV2('Random', messageId1, 'Sup')).toStrictEqual(FORBIDDEN);
    });
    test('message over 1000 characters', () => {
      const newMessage = 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked. What s happened to me? he thought. It wasn t a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the house';
      expect(reqMessageEditV2(userId1.token, messageId1, newMessage)).toStrictEqual(BAD_REQUEST);
    });
    test('Invalid messageId', () => {
      expect(reqMessageEditV2(userId1.token, messageId1 + 1, 'newMessage')).toStrictEqual(BAD_REQUEST);
    });
    test('user not sender of message and not a ownermember', () => {
      expect(reqMessageEditV2(userId2.token, messageId1, 'newMessage')).toStrictEqual(FORBIDDEN);
      expect(reqMessageEditV2(userId2.token, messageId2, 'newMessage')).toStrictEqual(FORBIDDEN);
    });
  });

  describe('Valid Parameters', () => {
    test('user not sender of message but is a ownermember (channel)', () => {
      const message3 = reqMessageSendV2(userId2.token, channelId1, 'Second');
      expect(reqMessageEditV2(userId1.token, message3.messageId, 'Edited message')).toStrictEqual({});
      expect(reqChannelMessagesV3(userId1.token, channelId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: message3.messageId,
            uId: userId2.authUserId,
            message: 'Edited message',
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
    test('user not sender of message but is a ownermember (dm)', () => {
      const message3 = reqMessageSendDmV2(userId2.token, dmId1, 'Second');
      expect(reqMessageEditV2(userId1.token, message3.messageId, 'Edited message')).toStrictEqual({});
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: message3.messageId,
            uId: userId2.authUserId,
            message: 'Edited message',
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

    test('global owner editing member message', () => {
      const channel2 = reqChannelsCreateV3(userId2.token, 'COMP4321', true);
      reqChannelJoinV3(userId1.token, channel2.channelId);
      const message3 = reqMessageSendV2(userId2.token, channel2.channelId, 'First');
      expect(reqMessageEditV2(userId1.token, message3.messageId, 'Not before me!')).toStrictEqual({});
      expect(reqChannelMessagesV3(userId2.token, channel2.channelId, 0)).toStrictEqual({
        messages: [
          {
            messageId: message3.messageId,
            uId: userId2.authUserId,
            message: 'Not before me!',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });

    test('user editing their own message (channel)', () => {
      const message3 = reqMessageSendV2(userId2.token, channelId1, 'Second');
      expect(reqMessageEditV2(userId1.token, messageId1, 'who do you call??')).toStrictEqual({});
      expect(reqChannelMessagesV3(userId2.token, channelId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: message3.messageId,
            uId: userId2.authUserId,
            message: 'Second',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: messageId1,
            uId: userId1.authUserId,
            message: 'who do you call??',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
    });
    test('user editing their own message (dm)', () => {
      const message3 = reqMessageSendDmV2(userId2.token, dmId1, 'Second');
      expect(reqMessageEditV2(userId1.token, messageId1, 'who do you call??')).toStrictEqual({});
      expect(reqDmMessagesV2(userId2.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: message3.messageId,
            uId: userId2.authUserId,
            message: 'Second',
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
    test('user deleting their message', () => {
      const message3 = reqMessageSendV2(userId2.token, channelId1, 'Second');
      const message4 = reqMessageSendDmV2(userId2.token, dmId1, 'Second');
      const message5 = reqMessageSendDmV2(userId1.token, dmId1, 'Third');
      expect(reqMessageEditV2(userId1.token, messageId1, '')).toStrictEqual({});
      expect(reqMessageEditV2(userId2.token, message4.messageId, '')).toStrictEqual({});
      expect(reqChannelMessagesV3(userId2.token, channelId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: message3.messageId,
            uId: userId2.authUserId,
            message: 'Second',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
        ],
        start: 0,
        end: -1,
      });
      expect(reqDmMessagesV2(userId2.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: message5.messageId,
            uId: userId1.authUserId,
            message: 'Third',
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
    test('owner deleting member message', () => {
      const message3 = reqMessageSendV2(userId2.token, channelId1, 'Second');
      const message4 = reqMessageSendDmV2(userId2.token, dmId1, 'Hello');
      expect(reqMessageEditV2(userId1.token, message3.messageId, '')).toStrictEqual({});
      expect(reqMessageEditV2(userId1.token, message4.messageId, '')).toStrictEqual({});
      expect(reqChannelMessagesV3(userId2.token, channelId1, 0)).toStrictEqual({
        messages: [
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
      expect(reqDmMessagesV2(userId2.token, dmId1, 0)).toStrictEqual({
        messages: [
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

    test('editing messages in multiple channels and dms', () => {
      const message3 = reqMessageSendV2(userId2.token, channelId1, 'Second');
      const message4 = reqMessageSendDmV2(userId2.token, dmId1, 'Hello');
      const user3 = reqAuthRegisterV3('somebody@hotmail.com', 'CodingCool123', 'Tim', 'Stewart');
      const channel2 = reqChannelsCreateV3(user3.token, 'ELEC1111', true);
      const dm2 = reqDmCreateV2(userId2.token, [userId1.authUserId, user3.authUserId]);
      const message5 = reqMessageSendV2(user3.token, channel2.channelId, 'nice');
      const message6 = reqMessageSendV2(user3.token, channel2.channelId, 'is');
      const message7 = reqMessageSendV2(user3.token, channel2.channelId, 'Weather');
      const message8 = reqMessageSendDmV2(userId2.token, dm2.dmId, 'Sunny');
      const message9 = reqMessageSendDmV2(user3.token, dm2.dmId, 'Rainy');
      expect(reqMessageEditV2(user3.token, message6.messageId, 'not')).toStrictEqual({});
      expect(reqMessageEditV2(userId2.token, message9.messageId, 'Snowy')).toStrictEqual({});
      expect(reqMessageEditV2(userId1.token, message3.messageId, '')).toStrictEqual({});
      expect(reqMessageEditV2(userId1.token, message4.messageId, '')).toStrictEqual({});
      expect(reqChannelMessagesV3(user3.token, channel2.channelId, 0)).toStrictEqual({
        messages: [
          {
            messageId: message7.messageId,
            uId: user3.authUserId,
            message: 'Weather',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: message6.messageId,
            uId: user3.authUserId,
            message: 'not',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: message5.messageId,
            uId: user3.authUserId,
            message: 'nice',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }
        ],
        start: 0,
        end: -1,
      });
      expect(reqDmMessagesV2(userId1.token, dm2.dmId, 0)).toStrictEqual({
        messages: [
          {
            messageId: message9.messageId,
            uId: user3.authUserId,
            message: 'Snowy',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: message8.messageId,
            uId: userId2.authUserId,
            message: 'Sunny',
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

describe('/message/remove/v2', () => {
  let user1: USERID;
  let userId1: number;
  let user2: USERID;
  let userId2: number;
  let channel1: CHANNELID;
  let channelId1: number;
  let channel2: CHANNELID;
  let channelId2: number;
  let dm1: DMID;
  let dmId1: number;
  let dm2: DMID;
  let dmId2: number;
  let message1: MESSAGE;
  let messageId1: number;
  let message2: MESSAGE;
  let messageId2: number;
  let message3: MESSAGE;
  let messageId3: number;
  let message4: MESSAGE;
  let messageId4: number;

  describe('Invalid Parameters', () => {
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId1 = user1.authUserId;
      user2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
      userId2 = user2.authUserId;
      channel1 = reqChannelsCreateV3(user1.token, 'COMP1531', true);
      channelId1 = channel1.channelId;
      message1 = reqMessageSendV2(user1.token, channelId1, 'hello');
      messageId1 = message1.messageId;
      message2 = reqMessageSendV2(user2.token, channelId1, 'world');
      messageId2 = message2.messageId;
    });
    test('Invalid Token', () => {
      expect(reqMessageRemoveV2('token', messageId1)).toStrictEqual(FORBIDDEN);
      expect(reqMessageRemoveV2(null, messageId1)).toStrictEqual(FORBIDDEN);
    });

    test('Invalid messageId', () => {
      expect(reqMessageRemoveV2(user1.token, -1)).toStrictEqual(BAD_REQUEST);
      expect(reqMessageRemoveV2(user1.token, 90)).toStrictEqual(BAD_REQUEST);
      expect(reqMessageRemoveV2(user1.token, null)).toStrictEqual(BAD_REQUEST);
    });

    test('token doesnt match', () => {
      expect(reqMessageRemoveV2(user1.token, messageId2)).toStrictEqual(BAD_REQUEST);
      expect(reqMessageRemoveV2(user2.token, messageId1)).toStrictEqual(FORBIDDEN);
    });
  });

  describe('Removing messages from channels', () => {
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId1 = user1.authUserId;
      user2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
      userId2 = user2.authUserId;
      channel1 = reqChannelsCreateV3(user1.token, 'COMP1531', true);
      channelId1 = channel1.channelId;
      reqChannelJoinV3(user2.token, channelId1);
      message1 = reqMessageSendV2(user1.token, channelId1, 'hello');
      messageId1 = message1.messageId;
      message2 = reqMessageSendV2(user2.token, channelId1, 'world');
      messageId2 = message2.messageId;
      message3 = reqMessageSendV2(user1.token, channelId1, 'yay');
      messageId3 = message3.messageId;
    });

    test('Removing messages a single channel', () => {
      expect(reqMessageRemoveV2(user2.token, messageId2)).toStrictEqual({});
      expect(reqChannelMessagesV3(user1.token, channelId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId1,
              uId: userId1,
              message: 'hello',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
      expect(reqMessageRemoveV2(user1.token, messageId1)).toStrictEqual({});
      expect(reqChannelMessagesV3(user1.token, channelId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
      expect(reqMessageRemoveV2(user1.token, messageId3)).toStrictEqual({});
      expect(reqChannelMessagesV3(user1.token, channelId1, 0)).toStrictEqual(
        {
          messages: [],
          start: 0,
          end: -1,
        }
      );
    });

    test('Removing messages from multiple channels', () => {
      channel2 = reqChannelsCreateV3(user1.token, 'COMP1111', true);
      channelId2 = channel2.channelId;
      reqChannelJoinV3(user2.token, channel2.channelId);
      message4 = reqMessageSendV2(user1.token, channelId2, 'message');
      messageId4 = message4.messageId;
      expect(reqMessageRemoveV2(user2.token, messageId2)).toStrictEqual({});
      expect(reqChannelMessagesV3(user1.token, channelId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId1,
              uId: userId1,
              message: 'hello',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
      expect(reqChannelMessagesV3(user1.token, channelId2, 0)).toStrictEqual(
        {
          messages: [{
            messageId: messageId4,
            uId: userId1,
            message: 'message',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }],
          start: 0,
          end: -1,
        }
      );

      expect(reqMessageRemoveV2(user1.token, messageId4)).toStrictEqual({});
      expect(reqChannelMessagesV3(user1.token, channelId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId1,
              uId: userId1,
              message: 'hello',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            ],
          start: 0,
          end: -1,
        }
      );
      expect(reqChannelMessagesV3(user1.token, channelId2, 0)).toStrictEqual(
        {
          messages: [],
          start: 0,
          end: -1,
        }
      );
    });

    test('Owner deleting messages', () => {
      message4 = reqMessageSendV2(user2.token, channelId1, 'message');
      messageId4 = message4.messageId;
      expect(reqMessageRemoveV2(user1.token, messageId2)).toStrictEqual({});
      expect(reqChannelMessagesV3(user1.token, channelId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId4,
              uId: userId2,
              message: 'message',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId1,
              uId: userId1,
              message: 'hello',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
      expect(reqMessageRemoveV2(user1.token, messageId4)).toStrictEqual({});
      expect(reqChannelMessagesV3(user1.token, channelId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId1,
              uId: userId1,
              message: 'hello',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
    });

    test('Global owner deleting messages', () => {
      channel2 = reqChannelsCreateV3(user2.token, 'COMP2222', true);
      channelId2 = channel2.channelId;
      reqChannelJoinV3(user1.token, channel2.channelId);
      message4 = reqMessageSendV2(user2.token, channelId2, 'message');
      messageId4 = message4.messageId;
      expect(reqMessageRemoveV2(user1.token, messageId4)).toStrictEqual({});
      expect(reqChannelMessagesV3(user1.token, channelId2, 0)).toStrictEqual(
        {
          messages: [],
          start: 0,
          end: -1,
        }
      );
    });
  });

  describe('Removing messages from DMs', () => {
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      userId1 = user1.authUserId;
      user2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
      userId2 = user2.authUserId;
      dm1 = reqDmCreateV2(user1.token, [user2.authUserId]);
      dmId1 = dm1.dmId;
      message1 = reqMessageSendDmV2(user1.token, dmId1, 'hello');
      messageId1 = message1.messageId;
      message2 = reqMessageSendDmV2(user2.token, dmId1, 'world');
      messageId2 = message2.messageId;
      message3 = reqMessageSendDmV2(user1.token, dmId1, 'yay');
      messageId3 = message3.messageId;
    });

    test('Removing messages from a single DM', () => {
      expect(reqMessageRemoveV2(user2.token, messageId2)).toStrictEqual({});
      expect(reqDmMessagesV2(user1.token, dmId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId1,
              uId: userId1,
              message: 'hello',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
      expect(reqMessageRemoveV2(user1.token, messageId1)).toStrictEqual({});
      expect(reqDmMessagesV2(user1.token, dmId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
      expect(reqMessageRemoveV2(user1.token, messageId3)).toStrictEqual({});
      expect(reqDmMessagesV2(user1.token, dmId1, 0)).toStrictEqual(
        {
          messages: [],
          start: 0,
          end: -1,
        }
      );
    });

    test('Removing messages from multiple DMs', () => {
      dm2 = reqDmCreateV2(user2.token, [user1.authUserId]);
      dmId2 = dm2.dmId;
      message4 = reqMessageSendDmV2(user1.token, dmId2, 'message');
      messageId4 = message4.messageId;
      expect(reqMessageRemoveV2(user2.token, messageId2)).toStrictEqual({});
      expect(reqDmMessagesV2(user1.token, dmId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId1,
              uId: userId1,
              message: 'hello',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
      expect(reqDmMessagesV2(user1.token, dmId2, 0)).toStrictEqual(
        {
          messages: [{
            messageId: messageId4,
            uId: userId1,
            message: 'message',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          }],
          start: 0,
          end: -1,
        }
      );

      expect(reqMessageRemoveV2(user1.token, messageId4)).toStrictEqual({});
      expect(reqDmMessagesV2(user1.token, dmId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId1,
              uId: userId1,
              message: 'hello',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
      expect(reqDmMessagesV2(user1.token, dmId2, 0)).toStrictEqual(
        {
          messages: [],
          start: 0,
          end: -1,
        }
      );
    });

    test('Owner removing messages', () => {
      message4 = reqMessageSendDmV2(user2.token, dmId1, 'message');
      messageId4 = message4.messageId;
      expect(reqMessageRemoveV2(user2.token, messageId2)).toStrictEqual({});
      expect(reqDmMessagesV2(user1.token, dmId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId4,
              uId: userId2,
              message: 'message',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId1,
              uId: userId1,
              message: 'hello',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
      expect(reqMessageRemoveV2(user1.token, messageId4)).toStrictEqual({});
      expect(reqDmMessagesV2(user1.token, dmId1, 0)).toStrictEqual(
        {
          messages:
            [{
              messageId: messageId3,
              uId: userId1,
              message: 'yay',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            },
            {
              messageId: messageId1,
              uId: userId1,
              message: 'hello',
              timeSent: expect.any(Number),
              isPinned: false,
              reacts: []
            }],
          start: 0,
          end: -1,
        }
      );
    });

    test('Global owner deleting messages', () => {
      dm2 = reqDmCreateV2(user2.token, [user1.authUserId]);
      dmId2 = dm2.dmId;
      message4 = reqMessageSendDmV2(user2.token, dmId2, 'message');
      messageId4 = message4.messageId;
      expect(reqMessageRemoveV2(user1.token, messageId4)).toStrictEqual({});
      expect(reqDmMessagesV2(user1.token, dmId2, 0)).toStrictEqual(
        {
          messages: [],
          start: 0,
          end: -1,
        }
      );
    });
  });
});

describe('/message/senddm/v2', () => {
  let user1: USERID;
  let userId1: USERID;
  let user2: USERID;
  let userId2: USERID;
  let dm1: DmCreateObject;
  let dmId1: number;

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

  describe('Invalid Parameters', () => {
    test('Invalid dmId', () => {
      expect(reqMessageSendDmV2(userId1.token, dmId1 + 1, 'Hello World!')).toStrictEqual(BAD_REQUEST);
    });
    test('Invalid user token', () => {
      expect(reqMessageSendDmV2('Random', dmId1, 'Hello World')).toStrictEqual(FORBIDDEN);
    });
    test('user not member of dm', () => {
      const user3: USERID = reqAuthRegisterV3('example2@gmail.com', 'testing124', 'Jim', 'Parrot');
      let userId3: string;
      if ('authUserId' in user3) {
        userId3 = user3.token;
      }
      expect(reqMessageSendDmV2(userId3, dmId1, 'Hello World!')).toStrictEqual(FORBIDDEN);
    });
    test('empty message', () => {
      expect(reqMessageSendDmV2(userId2.token, dmId1, '')).toStrictEqual(BAD_REQUEST);
    });
    test('message over 1000 characters', () => {
      const message = 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked. What s happened to me? he thought. It wasn t a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the house';
      expect(reqMessageSendDmV2(userId2.token, dmId1, message)).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid Parameters', () => {
    test('owner sending message to channel', () => {
      const dmMessage = reqMessageSendDmV2(userId1.token, dmId1, 'Hello World!');
      expect(dmMessage).toStrictEqual(messageId);
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [{
          messageId: dmMessage.messageId,
          uId: userId1.authUserId,
          message: 'Hello World!',
          timeSent: expect.any(Number),
          isPinned: false,
          reacts: []
        }],
        start: 0,
        end: -1,
      });
    });

    test('non-owner sending message to dm', () => {
      const dmMessage = reqMessageSendDmV2(userId1.token, dmId1, 'Hello World!');
      const dmMessage2 = reqMessageSendDmV2(userId2.token, dmId1, 'Hey Mr Sparrow :)');
      expect(dmMessage2).toStrictEqual(messageId);
      expect(reqDmMessagesV2(userId2.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: dmMessage2.messageId,
            uId: userId2.authUserId,
            message: 'Hey Mr Sparrow :)',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: dmMessage.messageId,
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

    test('testing unique ids for messages across channels and dms', () => {
      const channel = reqChannelsCreateV3(userId2.token, 'COMP1531', true);
      reqMessageSendV2(userId2.token, channel.channelId, 'I Love Coding');
      reqMessageSendDmV2(userId1.token, dmId1, 'Hello World!');
      reqMessageSendV2(userId2.token, channel.channelId, 'Yo');
      const dmMessage2 = reqMessageSendDmV2(userId2.token, dmId1, 'Hey Mr Sparrow :)');
      expect(dmMessage2).toStrictEqual(messageId);
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 3,
            uId: userId2.authUserId,
            message: 'Hey Mr Sparrow :)',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: 1,
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

    test('sending messages to multiple dms', () => {
      const user3 = reqAuthRegisterV3('rain@gmail.com', 'testing1245', 'Richard', 'Petty');
      const dmMessage = reqMessageSendDmV2(userId1.token, dmId1, 'Hello World!');
      const dm2 = reqDmCreateV2(user3.token, [userId2.authUserId, userId1.authUserId]);
      const dmMessage2 = reqMessageSendDmV2(userId2.token, dm2.dmId, 'Hey Mr Sparrow :)');
      const dmMessage3 = reqMessageSendDmV2(user3.token, dm2.dmId, 'I donno what to say');
      expect(dmMessage).toStrictEqual(messageId);
      expect(dmMessage2).toStrictEqual(messageId);
      expect(dmMessage3).toStrictEqual(messageId);
      expect(reqDmMessagesV2(userId2.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 0,
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
      expect(reqDmMessagesV2(userId2.token, dm2.dmId, 0)).toStrictEqual({
        messages: [
          {
            messageId: 2,
            uId: user3.authUserId,
            message: 'I donno what to say',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: 1,
            uId: userId2.authUserId,
            message: 'Hey Mr Sparrow :)',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
        ],
        start: 0,
        end: -1,
      });
    });
  });
});

describe('/message/senddm/v2', () => {
  let user1: USERID;
  let userId1: USERID;
  let user2: USERID;
  let userId2: USERID;
  let dm1: DmCreateObject;
  let dmId1: number;

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

  describe('Invalid Parameters', () => {
    test('Invalid dmId', () => {
      expect(reqMessageSendDmV2(userId1.token, dmId1 + 1, 'Hello World!')).toStrictEqual(BAD_REQUEST);
    });
    test('Invalid user token', () => {
      expect(reqMessageSendDmV2('Random', dmId1, 'Hello World')).toStrictEqual(FORBIDDEN);
    });
    test('user not member of dm', () => {
      const user3: USERID = reqAuthRegisterV3('example2@gmail.com', 'testing124', 'Jim', 'Parrot');
      let userId3: string;
      if ('authUserId' in user3) {
        userId3 = user3.token;
      }
      expect(reqMessageSendDmV2(userId3, dmId1, 'Hello World!')).toStrictEqual(FORBIDDEN);
    });
    test('empty message', () => {
      expect(reqMessageSendDmV2(userId2.token, dmId1, '')).toStrictEqual(BAD_REQUEST);
    });
    test('message over 1000 characters', () => {
      const message = 'One morning, when Gregor Samsa woke from troubled dreams, he found himself transformed in his bed into a horrible vermin. He lay on his armour-like back, and if he lifted his head a little he could see his brown belly, slightly domed and divided by arches into stiff sections. The bedding was hardly able to cover it and seemed ready to slide off any moment. His many legs, pitifully thin compared with the size of the rest of him, waved about helplessly as he looked. What s happened to me? he thought. It wasn t a dream. His room, a proper human room although a little too small, lay peacefully between its four familiar walls. A collection of textile samples lay spread out on the table - Samsa was a travelling salesman - and above it there hung a picture that he had recently cut out of an illustrated magazine and housed in a nice, gilded frame. It showed a lady fitted out with a fur hat and fur boa who sat upright, raising a heavy fur muff that covered the whole of her lower arm towards the house';
      expect(reqMessageSendDmV2(userId2.token, dmId1, message)).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid Parameters', () => {
    test('owner sending message to channel', () => {
      const dmMessage = reqMessageSendDmV2(userId1.token, dmId1, 'Hello World!');
      expect(dmMessage).toStrictEqual(messageId);
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [{
          messageId: dmMessage.messageId,
          uId: userId1.authUserId,
          message: 'Hello World!',
          timeSent: expect.any(Number),
          isPinned: false,
          reacts: []
        }],
        start: 0,
        end: -1,
      });
    });

    test('non-owner sending message to dm', () => {
      const dmMessage = reqMessageSendDmV2(userId1.token, dmId1, 'Hello World!');
      const dmMessage2 = reqMessageSendDmV2(userId2.token, dmId1, 'Hey Mr Sparrow :)');
      expect(dmMessage2).toStrictEqual(messageId);
      expect(reqDmMessagesV2(userId2.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: dmMessage2.messageId,
            uId: userId2.authUserId,
            message: 'Hey Mr Sparrow :)',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: dmMessage.messageId,
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

    test('testing unique ids for messages across channels and dms', () => {
      const channel = reqChannelsCreateV3(userId2.token, 'COMP1531', true);
      reqMessageSendV2(userId2.token, channel.channelId, 'I Love Coding');
      reqMessageSendDmV2(userId1.token, dmId1, 'Hello World!');
      const channelMessage = reqMessageSendV2(userId2.token, channel.channelId, 'Yo');
      const dmMessage2 = reqMessageSendDmV2(userId2.token, dmId1, 'Hey Mr Sparrow :)');
      expect(channelMessage.messageId).toBe(2);
      expect(dmMessage2).toStrictEqual(messageId);
      expect(reqDmMessagesV2(userId1.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 3,
            uId: userId2.authUserId,
            message: 'Hey Mr Sparrow :)',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: 1,
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

    test('sending messages to multiple dms', () => {
      const user3 = reqAuthRegisterV3('rain@gmail.com', 'testing1245', 'Richard', 'Petty');
      const dmMessage = reqMessageSendDmV2(userId1.token, dmId1, 'Hello World!');
      const dm2 = reqDmCreateV2(user3.token, [userId2.authUserId, userId1.authUserId]);
      const dmMessage2 = reqMessageSendDmV2(userId2.token, dm2.dmId, 'Hey Mr Sparrow :)');
      const dmMessage3 = reqMessageSendDmV2(user3.token, dm2.dmId, 'I donno what to say');
      expect(dmMessage).toStrictEqual(messageId);
      expect(dmMessage2).toStrictEqual(messageId);
      expect(dmMessage3).toStrictEqual(messageId);
      expect(reqDmMessagesV2(userId2.token, dmId1, 0)).toStrictEqual({
        messages: [
          {
            messageId: 0,
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
      expect(reqDmMessagesV2(userId2.token, dm2.dmId, 0)).toStrictEqual({
        messages: [
          {
            messageId: 2,
            uId: user3.authUserId,
            message: 'I donno what to say',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
          {
            messageId: 1,
            uId: userId2.authUserId,
            message: 'Hey Mr Sparrow :)',
            timeSent: expect.any(Number),
            isPinned: false,
            reacts: []
          },
        ],
        start: 0,
        end: -1,
      });
    });
  });
});

describe('/message/senddm/v2', () => {
  let user1: USERID;
  let userId1: number;
  let user2: USERID;
  let userId2: number;
  let dm1: DmCreateObject;
  let dmId1: number;
  let channel1: Channel;
  let channelId1: number;
  let msg1: MESSAGE;
  let msg2: MESSAGE;
  let msg3: MESSAGE;
  let msg4: MESSAGE;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
    user2 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
    if ('authUserId' in user1 && 'authUserId' in user2) {
      userId1 = user1.authUserId;
      userId2 = user2.authUserId;
    }
    dm1 = reqDmCreateV2(user1.token, [userId2]);
    if ('dmId' in dm1) {
      dmId1 = dm1.dmId;
    }
    channel1 = reqChannelsCreateV3(user1.token, 'channel1', true);
    channelId1 = channel1.channelId;
    reqChannelJoinV3(user2.token, channelId1);

    msg1 = reqMessageSendDmV2(user1.token, dmId1, 'Hello World!');
    msg2 = reqMessageSendDmV2(user2.token, dmId1, 'Hello world and Mr Penguin :)');
    msg3 = reqMessageSendV2(user1.token, channelId1, 'hello');
    msg4 = reqMessageSendV2(user2.token, channelId1, 'Hello there!');
    reqMessagePinV1(user1.token, msg4.messageId);
  });

  describe('Invalid Parameters', () => {
    test('Invalid token', () => {
      expect(reqSearchV1('token', 'hello')).toStrictEqual(FORBIDDEN);
    });

    test('queryString too short', () => {
      expect(reqSearchV1(user1.token, '')).toStrictEqual(BAD_REQUEST);
    });

    test('queryString too long', () => {
      expect(reqSearchV1(user1.token, 'Once upon a time, there was a penguin named Captain Jack who sailed the seven seas as a pirate. He had a crew of trusty penguins who followed him on his daring adventures. Captain Jack was known for his bravery, his sharp mind, and his love for treasure.One day, Captain Jack and his crew stumbled upon a map that led to the most valuable treasure in all the land. They set sail on their ship, the "Black Beak," and sailed towards the treasure. Along the way, they faced many obstacles and challenges, including fierce storms and dangerous sea monsters. But Captain Jack and his crew were determined to reach their goal. Finally, after many long weeks at sea, they reached the island where the treasure was said to be hidden. They battled their way through the jungle and finally found the treasure chest. It was filled to the brim with gold, jewels, and other precious items. As they were about to leave the island, they were ambushed by a rival pirate crew. The battle was long and fierce, but Captain Jack and his crew emerged victorious. They returned to their ship, the "Black Beak," with the treasure in tow. Captain Jack and his crew celebrated their victory with a big feast on the deck of their ship. They toasted to their success and to the adventure they had just experienced. Captain Jack knew that there would be many more adventures to come, but for now, he was happy to enjoy the spoils of his latest conquest. And so, Captain Jack the penguin pirate continued to sail the seas, searching for treasure and living a life of adventure. His crew knew that wherever they went, they could always count on their brave and cunning captain to lead them to victory.')).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid Parameters', () => {
    test('case Insensitive', () => {
      expect(reqSearchV1(user1.token, 'world')).toStrictEqual({
        messages:
          [{
            messageId: msg2.messageId,
            uId: userId2,
            message: 'Hello world and Mr Penguin :)',
            timeSent: expect.any(Number),
            reacts: [],
            isPinned: false
          },
          {
            messageId: msg1.messageId,
            uId: userId1,
            message: 'Hello World!',
            timeSent: expect.any(Number),
            reacts: [],
            isPinned: false
          }]
      });
    });

    test('String in every message', () => {
      expect(reqSearchV1(user1.token, 'hello')).toStrictEqual({
        messages:
          [{
            messageId: msg2.messageId,
            uId: userId2,
            message: 'Hello world and Mr Penguin :)',
            timeSent: expect.any(Number),
            reacts: [],
            isPinned: false
          },
          {
            messageId: msg1.messageId,
            uId: userId1,
            message: 'Hello World!',
            timeSent: expect.any(Number),
            reacts: [],
            isPinned: false
          },
          {
            messageId: msg4.messageId,
            uId: userId2,
            message: 'Hello there!',
            timeSent: expect.any(Number),
            reacts: [],
            isPinned: true
          },
          {
            messageId: msg3.messageId,
            uId: userId1,
            message: 'hello',
            timeSent: expect.any(Number),
            reacts: [],
            isPinned: false
          }]
      });
    });

    test('punctuation', () => {
      expect(reqSearchV1(user1.token, '!')).toStrictEqual({
        messages:
          [{
            messageId: msg1.messageId,
            uId: userId1,
            message: 'Hello World!',
            timeSent: expect.any(Number),
            reacts: [],
            isPinned: false
          },
          {
            messageId: msg4.messageId,
            uId: userId2,
            message: 'Hello there!',
            timeSent: expect.any(Number),
            reacts: [],
            isPinned: true
          }]
      });
    });
  });
});
