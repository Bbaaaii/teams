import {
  reqAuthRegisterV3,
  reqChannelsCreateV3,
  reqChannelsListAllV3,
  reqClearV1,
  reqMessageSendV2,
  reqDmCreateV2,
  reqNotificationsGetV1,
  reqMessageSendDmV2,
  reqMessageSendLaterV1,
  reqMessageSendLaterDmV1,
  reqChannelJoinV3,
  reqMessageShareV1,
  reqMessageEditV2,
  reqMessageReactV1,
  reqDmLeaveV2,
  reqMessageUnreactV1
} from '../src/requestHelpers';

import { FORBIDDEN } from '../src/httpsConsts';

const USERID = { token: expect.any(String), authUserId: expect.any(Number) };
type ERROR = { error: string };
type CHANNELID = { channelId: number };
import type { DmCreateObject } from '../src/types/dm';

const sleepSync = (ms: number) => {
  const end = new Date().getTime() + ms;
  while (new Date().getTime() < end) { /* do nothing */ }
};

// We need to clear the data store before each test to prevent unexpected behaviour
beforeEach(() => {
  reqClearV1();
});

// reqClearV1 is a very simple function, with no unique cases, so testing it is simple.
// We simply populate a channel and a user, then call reqClearV1, and check that the
// channel and user have both been deleted.
describe('reqClearV1', () => {
  test('Test reqClearV1', () => {
    let user: typeof USERID = reqAuthRegisterV3(
      'vandrew@gmail.com',
      'andrew123',
      'Van',
      'Andrew'
    );

    reqChannelsCreateV3(
      user.authUserId,
      "Van's Channel",
      true
    );

    expect(reqClearV1()).toStrictEqual({});

    // Creating another user with the same address as a previously created user.
    // If reqClearV1 didn't wipe the users, this test would fail, as it would
    // retun an error rather than an authUserId.
    user = reqAuthRegisterV3(
      'vandrew@gmail.com',
      'andrew123',
      'Van',
      'Andrew'
    );
    expect(user).toStrictEqual({ authUserId: expect.any(Number), token: expect.any(String) });

    // If reqClearV1 worked, there should be no channels.
    const channels = reqChannelsListAllV3(user.token);
    expect(channels.channels.length).toStrictEqual(0);
  });
});

describe('/notifications/get/v1', () => {
  let user1: typeof USERID, user2: typeof USERID;
  let userId1: typeof USERID, userId2: typeof USERID;
  let channel1: CHANNELID | ERROR;
  let channelId1: number;
  let dm1: DmCreateObject | ERROR;
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
  });

  describe('Invalid Case', () => {
    test('Invalid user token', () => {
      expect(reqNotificationsGetV1('Random')).toEqual(FORBIDDEN);
    });
  });

  describe('Valid Parameters', () => {
    test('No user notifications', () => {
      expect(reqNotificationsGetV1(userId1.token)).toEqual({ notifications: [] });
    });
    test('user notifications - tagging from channel and dm messages', () => {
      reqMessageSendV2(userId1.token, channelId1, 'Hello @brucewayne@jacksparrow');
      reqMessageSendDmV2(userId1.token, dmId1, 'Welcome @brucewayne to the club!');
      expect(reqNotificationsGetV1(userId1.token)).toEqual({
        notifications: [
          {
            channelId: channelId1,
            dmId: -1,
            notificationMessage: 'jacksparrow tagged you in COMP1531: Hello @brucewayne@ja'
          }
        ]
      });
      expect(reqNotificationsGetV1(userId2.token)).toEqual({
        notifications: [
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow tagged you in brucewayne, jacksparrow: Welcome @brucewayne '
          },
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow added you to brucewayne, jacksparrow'
          }
        ]
      });
    });

    test('user notifications - tagging from sendLater channel and dm messages', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      const timeNow = Math.floor((new Date()).getTime() / 1000);
      reqMessageSendLaterV1(userId1.token, channelId1, 'Hello @handle1@brucewayne', timeNow + 2);
      reqMessageSendLaterDmV1(userId1.token, dmId1, 'Welcome @brucewayne to the club @handle5', timeNow + 3);
      expect(reqNotificationsGetV1(userId2.token)).toEqual({
        notifications: [
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow added you to brucewayne, jacksparrow'
          }
        ]
      });
      sleepSync(4000);
      expect(reqNotificationsGetV1(userId2.token)).toEqual({
        notifications: [
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow tagged you in brucewayne, jacksparrow: Welcome @brucewayne '
          },
          {
            channelId: channelId1,
            dmId: -1,
            notificationMessage: 'jacksparrow tagged you in COMP1531: Hello @handle1@bruce'
          },
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow added you to brucewayne, jacksparrow'
          }
        ]
      });
    });

    test('user notifications - tagging from messageShare and user not part of dm/channel', () => {
      const message2 = reqMessageSendDmV2(userId1.token, dmId1, 'Welcome @brucewayne to the club!');
      reqMessageShareV1(userId1.token, message2.messageId, 'bump @brucewayne', channelId1, -1);
      reqChannelJoinV3(userId2.token, channelId1);
      reqMessageShareV1(userId1.token, message2.messageId, 'bump @brucewayne', channelId1, -1);
      const message1 = reqMessageSendV2(userId1.token, channelId1, 'Hello @brucewayne@jacksparrow');
      reqMessageShareV1(userId2.token, message1.messageId, '@jacksparrow', -1, dmId1);
      expect(reqNotificationsGetV1(userId1.token)).toEqual({
        notifications: [
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'brucewayne tagged you in brucewayne, jacksparrow: Hello @brucewayne@ja'
          },
          {
            channelId: channelId1,
            dmId: -1,
            notificationMessage: 'jacksparrow tagged you in COMP1531: Hello @brucewayne@ja'
          }
        ]
      });
      expect(reqNotificationsGetV1(userId2.token)).toEqual({
        notifications: [
          {
            channelId: channelId1,
            dmId: -1,
            notificationMessage: 'jacksparrow tagged you in COMP1531: Hello @brucewayne@ja'
          },
          {
            channelId: channelId1,
            dmId: -1,
            notificationMessage: 'jacksparrow tagged you in COMP1531: Welcome @brucewayne '
          },
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow tagged you in brucewayne, jacksparrow: Welcome @brucewayne '
          },
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow added you to brucewayne, jacksparrow'
          }
        ]
      });
    });

    test('user notifications - tagging from editing message', () => {
      const message1 = reqMessageSendV2(userId1.token, channelId1, 'Hello @brucewayne@jacksparrow');
      const message2 = reqMessageSendDmV2(userId1.token, dmId1, 'Welcome @brucewayne to the club!');
      reqMessageEditV2(userId1.token, message1.messageId, 'Hello @jacksparrow');
      reqMessageEditV2(userId1.token, message2.messageId, 'How are you @brucewayne');
      expect(reqNotificationsGetV1(userId1.token)).toEqual({
        notifications: [
          {
            channelId: channelId1,
            dmId: -1,
            notificationMessage: 'jacksparrow tagged you in COMP1531: Hello @jacksparrow'
          },
          {
            channelId: channelId1,
            dmId: -1,
            notificationMessage: 'jacksparrow tagged you in COMP1531: Hello @brucewayne@ja'
          }
        ]
      });
      expect(reqNotificationsGetV1(userId2.token)).toEqual({
        notifications: [
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow tagged you in brucewayne, jacksparrow: How are you @brucewa'
          },
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow tagged you in brucewayne, jacksparrow: Welcome @brucewayne '
          },
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow added you to brucewayne, jacksparrow'
          }
        ]
      });
    });

    test('user notifications - reacting to user message', () => {
      const message1 = reqMessageSendV2(userId1.token, channelId1, 'Hello @brucewayne@jacksparrow');
      const message2 = reqMessageSendDmV2(userId2.token, dmId1, 'Welcome @brucewayne to the club!');
      reqMessageReactV1(userId1.token, message1.messageId, 1);
      reqMessageReactV1(userId1.token, message2.messageId, 1);
      reqDmLeaveV2(userId2.token, dmId1);
      reqMessageUnreactV1(userId1.token, message2.messageId, 1);
      reqMessageReactV1(userId1.token, message2.messageId, 1);
      expect(reqNotificationsGetV1(userId1.token)).toEqual({
        notifications: [
          {
            channelId: channelId1,
            dmId: -1,
            notificationMessage: 'jacksparrow reacted to your message in COMP1531'
          },
          {
            channelId: channelId1,
            dmId: -1,
            notificationMessage: 'jacksparrow tagged you in COMP1531: Hello @brucewayne@ja'
          }
        ]
      });
      expect(reqNotificationsGetV1(userId2.token)).toEqual({
        notifications: [
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow reacted to your message in brucewayne, jacksparrow'
          },
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'brucewayne tagged you in brucewayne, jacksparrow: Welcome @brucewayne '
          },
          {
            channelId: -1,
            dmId: dmId1,
            notificationMessage: 'jacksparrow added you to brucewayne, jacksparrow'
          }
        ]
      });
    });
  });
});
