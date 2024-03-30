import {
  reqAuthRegisterV3,
  reqChannelsCreateV3,
  reqChannelsListV3,
  reqChannelsListAllV3,
  reqChannelJoinV3,
  reqClearV1,
} from '../src/requestHelpers';

import { FORBIDDEN, BAD_REQUEST } from '../src/httpsConsts';

const USERID = { token: expect.any(String), authUserId: expect.any(Number) };
const CHANNELID = { channelId: expect.any(Number) };

beforeEach(() => {
  reqClearV1();
});

describe('reqChannelsListV3', () => {
  let user: typeof USERID;
  let user2: typeof USERID;
  let channel: typeof CHANNELID;
  let channel2: typeof CHANNELID;
  let channel3: typeof CHANNELID;
  let channel4: typeof CHANNELID;
  beforeEach(() => {
    user = reqAuthRegisterV3('rishiisverycool@gmail.com', 'rishiisverycool', 'Rishi', 'Israni');
    user2 = reqAuthRegisterV3('2ndperson@gmail.com', 'password', 'Name', 'Last');
    channel = reqChannelsCreateV3(user.token, 'name', true);
  });

  test('Only 1 channel to list', () => {
    expect(reqChannelsListV3(user.token)).toStrictEqual({
      channels:
        [
          {
            channelId: channel.channelId,
            name: 'name',
          }
        ],
    });
  });

  test('User not part of any channel', () => {
    expect(reqChannelsListV3(user2.token)).toStrictEqual({
      channels: []
    });
  });

  test('User added to channel', () => {
    reqChannelJoinV3(user2.token, channel.channelId);
    expect(reqChannelsListV3(user2.token)).toStrictEqual({
      channels:
        [
          {
            channelId: channel.channelId,
            name: 'name',
          }
        ],
    });
  });

  test('User in all channels', () => {
    channel2 = reqChannelsCreateV3(user.token, 'name2', true);
    expect(reqChannelsListV3(user.token)).toStrictEqual({
      channels:
        [
          {
            channelId: channel.channelId,
            name: 'name',
          },
          {
            channelId: channel2.channelId,
            name: 'name2',
          }
        ],
    });
  });

  test('User in multiple but not all channels', () => {
    channel2 = reqChannelsCreateV3(user.token, 'name2', true);
    channel3 = reqChannelsCreateV3(user2.token, 'name3', true);
    channel4 = reqChannelsCreateV3(user.token, 'name4', true);
    expect(reqChannelsListV3(user.token)).toStrictEqual({
      channels:
        [
          {
            channelId: channel.channelId,
            name: 'name',
          },
          {
            channelId: channel2.channelId,
            name: 'name2',
          },
          {
            channelId: channel4.channelId,
            name: 'name4',
          }
        ],
    });
    expect(reqChannelsListV3(user2.token)).toStrictEqual({
      channels:
        [
          {
            channelId: channel3.channelId,
            name: 'name3',
          }
        ],
    });
  });
});

describe('reqChannelsListAllV3', () => {
  let user: typeof USERID;
  let user2: typeof USERID;
  let channel: typeof CHANNELID;
  let channel2: typeof CHANNELID;

  test('User invalid', () => {
    user = reqAuthRegisterV3('rishiisverycool@gmail.com', 'rishiisverycool', 'Rishi', 'Israni');
    expect(reqChannelsListAllV3('-1')).toStrictEqual(FORBIDDEN);
  });

  beforeEach(() => {
    user = reqAuthRegisterV3('rishiisverycool@gmail.com', 'rishiisverycool', 'Rishi', 'Israni');
    user2 = reqAuthRegisterV3('2ndperson@gmail.com', 'password', 'Name', 'Last');
    channel = reqChannelsCreateV3(user.token, 'name', true);
  });

  test('Only 1 channel to list', () => {
    expect(reqChannelsListAllV3(user.token)).toStrictEqual({
      channels:
        [
          {
            channelId: channel.channelId,
            name: 'name',
          }
        ],
    });
  });

  test('User not part of channel', () => {
    expect(reqChannelsListAllV3(user2.token)).toStrictEqual({
      channels:
        [
          {
            channelId: channel.channelId,
            name: 'name',
          }
        ],
    });
  });

  test('User in some but not all channels', () => {
    channel2 = reqChannelsCreateV3(user.token, 'name2', true);
    expect(reqChannelsListV3(user.token)).toStrictEqual({
      channels:
        [
          {
            channelId: channel.channelId,
            name: 'name',
          },
          {
            channelId: channel2.channelId,
            name: 'name2',
          },
        ],
    });
  });
});

describe('/channels/create/v2', () => {
  let user1: typeof USERID;
  let userId1: string;
  let user2: typeof USERID;
  let userId2: string;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('email@gmail.com', 'password123', 'Some', 'Guy');
    user2 = reqAuthRegisterV3('anotheremail@gmail.com', 'password456', 'Another', 'Guy');
    if ('authUserId' in user1 && 'authUserId' in user2) {
      userId1 = user1.token;
      userId2 = user2.token;
    }
  });

  describe('Invalid arguments', () => {
    test('Invalid authUserId', () => {
      expect(reqChannelsCreateV3('Random!!!!', 'Test Channel', true)).toStrictEqual(FORBIDDEN);
    });

    test('Invalid channel name ( >20 characters)', () => {
      expect(reqChannelsCreateV3(userId1, 'Test Channel1234567890', true)).toStrictEqual(BAD_REQUEST);
    });

    test('Invalid channel name ( <1 character)', () => {
      expect(reqChannelsCreateV3(userId1, '', true)).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid arguments', () => {
    const channelId1 = { channelId: 0 };
    const channelId2 = { channelId: 1 };

    test('first channel and second channel', () => {
      expect(reqChannelsCreateV3(userId1, 'Test Channel', true)).toEqual(channelId1);
      expect(reqChannelsCreateV3(userId2, 'Another Channel', true)).toEqual(channelId2);
    });
  });
});
