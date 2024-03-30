import { DEFAULT_PROFILE_IMG } from '../src/helper';
import {
  reqAuthRegisterV3,
  reqUsersAllV2,
  reqUserProfileV3,
  reqUserProfileSetNameV2,
  reqUserProfileSetEmailV2,
  reqUserProfileSetHandleV2,
  reqClearV1,
  reqUserStatsV1,
  reqChannelsCreateV3,
  reqDmCreateV2,
  reqChannelLeaveV2,
  reqMessageSendV2,
  reqMessageSendDmV2,
  reqMessageRemoveV2,
  reqWorkplaceStatsV1,
  reqDmRemoveV2
} from '../src/requestHelpers';

import { BAD_REQUEST, FORBIDDEN } from '../src/httpsConsts';

const USERID = { token: expect.any(String), authUserId: expect.any(Number) };
// type USERID = { authUserId: number, token: string }
const USER = { user: { uId: expect.any(Number), email: expect.any(String), nameFirst: expect.any(String), nameLast: expect.any(String), handleStr: expect.any(String), profileImgUrl: expect.any(String) } };
// type USER = { user: {uId: number, email: string, nameFirst: string, nameLast: string, handleStr: string} };
const MS = 1000;

beforeEach(() => {
  reqClearV1();
});

describe('/users/all/v2', () => {
  let user1: typeof USERID;
  let user2: typeof USERID;
  let user3: typeof USERID;
  describe('Invalid arguments', () => {
    test('Invalid token', () => {
      const invalidToken = 'invalid_token';
      user1 = reqAuthRegisterV3('example@gmail.com', 'test123', 'John', 'Smith');
      expect(reqUsersAllV2(invalidToken)).toStrictEqual(FORBIDDEN);
    });
  });
  describe('Valid cases', () => {
    test('Valid case', () => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'test123', 'John', 'Smith');
      user2 = reqAuthRegisterV3('example2@gmail.com', 'test1234', 'Dan', 'Smith');
      user3 = reqAuthRegisterV3('example3@gmail.com', 'test12345', 'Tane', 'Smith');
      expect(reqUsersAllV2(user1.token)).toStrictEqual({
        users: [
          {
            uId: user1.authUserId,
            email: 'example@gmail.com',
            nameFirst: 'John',
            nameLast: 'Smith',
            handleStr: 'johnsmith',
            profileImgUrl: DEFAULT_PROFILE_IMG,
          },
          {
            uId: user2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Dan',
            nameLast: 'Smith',
            handleStr: 'dansmith',
            profileImgUrl: DEFAULT_PROFILE_IMG,
          },
          {
            uId: user3.authUserId,
            email: 'example3@gmail.com',
            nameFirst: 'Tane',
            nameLast: 'Smith',
            handleStr: 'tanesmith',
            profileImgUrl: DEFAULT_PROFILE_IMG,
          },
        ]
      });
    });
  });
});

describe('UserProfile V3', () => {
  let user1Obj: typeof USERID;
  let user: typeof USERID;
  let user2Obj: typeof USERID;
  let user2: typeof USERID;
  let userExpected: typeof USER;
  let userExpected2: typeof USER;
  beforeEach(() => {
    user1Obj = reqAuthRegisterV3('rishiisverycool@gmail.com', 'rishiisverycool', 'Rishi', 'Israni');
    user2Obj = reqAuthRegisterV3('2ndperson@gmail.com', 'password', 'Name', 'Last');
    if ('authUserId' in user1Obj && 'authUserId' in user2Obj) {
      user = user1Obj;
      user2 = user2Obj;
    }

    userExpected = {
      user: {
        uId: user.authUserId,
        email: 'rishiisverycool@gmail.com',
        nameFirst: 'Rishi',
        nameLast: 'Israni',
        handleStr: 'rishiisrani',
        profileImgUrl: DEFAULT_PROFILE_IMG
      }
    };

    userExpected2 = {
      user: {
        uId: user2.authUserId,
        email: '2ndperson@gmail.com',
        nameFirst: 'Name',
        nameLast: 'Last',
        handleStr: 'namelast',
        profileImgUrl: DEFAULT_PROFILE_IMG
      }
    };
  });

  test('Looking up themself', () => {
    expect(reqUserProfileV3(user.token, user.authUserId)).toStrictEqual(userExpected);
  });

  test('Looking up themself 2', () => {
    expect(reqUserProfileV3(user2.token, user2.authUserId)).toStrictEqual(userExpected2);
  });

  test('Look up others', () => {
    expect(reqUserProfileV3(user.token, user2.authUserId)).toStrictEqual(userExpected2);
  });

  test('Look up others 2', () => {
    expect(reqUserProfileV3(user2.token, user.authUserId)).toStrictEqual(userExpected);
  });

  test('invalid token', () => {
    expect(reqUserProfileV3('invalid', user2.authUserId)).toStrictEqual(FORBIDDEN);
  });

  test('invalid uId', () => {
    expect(reqUserProfileV3(user.token, -1)).toStrictEqual(BAD_REQUEST);
  });
});

describe('/user/profile/setname/v2', () => {
  // cases:
  // - token invalid
  // - name invalid (in a few different ways)
  // - success

  let user1: typeof USERID;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('drac@vmail.com', 'bludsucka', 'Count', 'Dracula');
  });

  test('Invalid token', () => {
    expect(reqUserProfileSetNameV2('invalid token', 'Countess', 'Draculette')).toStrictEqual(FORBIDDEN);
  });

  test('Invalid Name', () => {
    expect(reqUserProfileSetNameV2(user1.token, 'Count', '')).toStrictEqual(BAD_REQUEST);
    expect(reqUserProfileSetNameV2(user1.token, '', 'Dracula')).toStrictEqual(BAD_REQUEST);
    expect(reqUserProfileSetNameV2(user1.token, 'CountCountCountCountCountCountCountCountCountCountC', 'Dracula')).toStrictEqual(BAD_REQUEST);
    expect(reqUserProfileSetNameV2(user1.token, 'Count', 'DraculaDraculaDraculaDraculaDraculaDraculaDraculaDr')).toStrictEqual(BAD_REQUEST);
  });

  test('Success', () => {
    expect(reqUserProfileSetNameV2(user1.token, 'Countess', 'Draculette')).toStrictEqual({});
    const result = reqUserProfileV3(user1.token, user1.authUserId);
    expect(result.user.nameFirst).toStrictEqual('Countess');
    expect(result.user.nameLast).toStrictEqual('Draculette');
  });
});

describe('/user/profile/setemail/v2', () => {
  // cases:
  // - token invalid
  // - email invalid
  // - email in use
  // - success

  let user1: typeof USERID;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('drac@vmail.com', 'bludsucka', 'Count', 'Dracula');
  });

  test('Invalid token', () => {
    expect(reqUserProfileSetEmailV2('invalid token', 'dracula@gmail.com')).toStrictEqual(FORBIDDEN);
  });

  test('Invalid email', () => {
    expect(reqUserProfileSetEmailV2(user1.token, 'dracula')).toStrictEqual(BAD_REQUEST);
  });

  test('Email in use', () => {
    reqAuthRegisterV3('dracula@gmail.com', 'dracbutevil', 'Lord', 'Dracula');
    expect(reqUserProfileSetEmailV2(user1.token, 'dracula@gmail.com')).toStrictEqual(BAD_REQUEST);
  });

  test('Success', () => {
    reqUserProfileSetEmailV2(user1.token, 'dracula@gmail.com');
    const result = reqUserProfileV3(user1.token, user1.authUserId);
    expect(result.user.email).toStrictEqual('dracula@gmail.com');
  });
});

describe('/user/profile/sethandle/v2', () => {
  // assumptions:
  // - uppercase letters are permitted - assuming that authregister only
  //   casts them to lower as a stylistic thing
  // cases:
  // - token invalid
  // - handle invalid (in a few different ways)
  // - handle in use
  // - success

  let user1: typeof USERID;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('drac@vmail.com', 'bludsucka', 'Count', 'Dracula');
  });

  test('Invalid token', () => {
    expect(reqUserProfileSetHandleV2('invalid token', 'BigBadDrac')).toStrictEqual(FORBIDDEN);
  });

  test('Invalid handle', () => {
    expect(reqUserProfileSetHandleV2(user1.token, 'Big Bad Drac')).toStrictEqual(BAD_REQUEST);
    expect(reqUserProfileSetHandleV2(user1.token, 'yo')).toStrictEqual(BAD_REQUEST);
    expect(reqUserProfileSetHandleV2(user1.token, 'Drac-Tacular')).toStrictEqual(BAD_REQUEST);
    expect(reqUserProfileSetHandleV2(user1.token, 'TheBiggestTheBaddestDrac')).toStrictEqual(BAD_REQUEST);
  });

  test('Handle in use', () => {
    reqAuthRegisterV3('dracula@gmail.com', 'dracbutevil', 'Lord', 'Dracula');
    expect(reqUserProfileSetHandleV2(user1.token, 'lorddracula')).toStrictEqual(BAD_REQUEST);
  });

  test('Success', () => {
    for (const handle of ['BigBadDrac', 'dr4c', 'TheBiggestTheBaddest', 'drC']) {
      expect(reqUserProfileSetHandleV2(user1.token, handle)).toStrictEqual({});
      const result = reqUserProfileV3(user1.token, user1.authUserId);
      expect(result.user.handleStr).toStrictEqual(handle);
    }
  });
});

describe('/user/stats/v1', () => {
  let user1: typeof USERID;
  let user2: typeof USERID;

  test('Invalid token', () => {
    expect(reqUserStatsV1('invalid token')).toStrictEqual(FORBIDDEN)
  })

  test('Empty case', () => {
    user1 = reqAuthRegisterV3('drac@vmail.com', 'bludsucka', 'Count', 'Dracula');
    var timeNow = Math.floor((new Date()).getTime() / MS);
    expect(reqUserStatsV1(user1.token)).toStrictEqual({
      channelsJoined: [{numChannelsJoined: 0, timeStamp: expect.any(Number)}],
      dmsJoined: [{numDmsJoined: 0, timeStamp: expect.any(Number)}], 
      messagesSent: [{numMessagesSent: 0, timeStamp: expect.any(Number)}], 
      involvementRate: 0
    })
    expect(reqUserStatsV1(user1.token).channelsJoined[0].timeStamp).toBeGreaterThanOrEqual(timeNow)
  })

  test('Combined test', () => {
    user1 = reqAuthRegisterV3('drac@vmail.com', 'bludsucka', 'Count', 'Dracula');
    var timeNow1 = Math.floor((new Date()).getTime() / MS);
    var channel1 = reqChannelsCreateV3(user1.token, 'cool channel', true);
    var timeNow2 = Math.floor((new Date()).getTime() / MS);
    expect(reqUserStatsV1(user1.token)).toStrictEqual({
      channelsJoined: [
        {numChannelsJoined: 0, timeStamp: expect.any(Number)}, 
        {numChannelsJoined: 1, timeStamp: expect.any(Number)}
      ],
      dmsJoined: [{numDmsJoined: 0, timeStamp: expect.any(Number)}], 
      messagesSent: [{numMessagesSent: 0, timeStamp: expect.any(Number)}], 
      involvementRate: 1
    })
    expect(reqUserStatsV1(user1.token).channelsJoined[1].timeStamp).toBeGreaterThanOrEqual(timeNow2)
    user2 = reqAuthRegisterV3('2ndperson@gmail.com', 'password', 'Name', 'Last');
    var timeNow3 = Math.floor((new Date()).getTime() / MS);
    var dm1 = reqDmCreateV2(user2.token, [user1.authUserId])
    expect(reqUserStatsV1(user1.token)).toStrictEqual({
      channelsJoined: [
        {numChannelsJoined: 0, timeStamp: expect.any(Number)}, 
        {numChannelsJoined: 1, timeStamp: expect.any(Number)}
      ],
      dmsJoined: [
        {numDmsJoined: 0, timeStamp: expect.any(Number)},
        {numDmsJoined: 1, timeStamp: expect.any(Number)}
      ], 
      messagesSent: [{numMessagesSent: 0, timeStamp: expect.any(Number)}], 
      involvementRate: 1
    })
    var message1 = reqMessageSendV2(user1.token, channel1.channelId, "this is a message")
    reqMessageSendDmV2(user1.token, dm1.dmId, "this is another message")
    reqMessageRemoveV2(user1.token, message1.messageId)
    reqChannelLeaveV2(user1.token, channel1.channelId)
    reqChannelsCreateV3(user2.token, "string", false)
    var timeNow3 = Math.floor((new Date()).getTime() / MS);
    expect(reqUserStatsV1(user1.token)).toStrictEqual({
      channelsJoined: [
        {numChannelsJoined: 0, timeStamp: expect.any(Number)}, 
        {numChannelsJoined: 1, timeStamp: expect.any(Number)},
        {numChannelsJoined: 0, timeStamp: expect.any(Number)}
      ],
      dmsJoined: [
        {numDmsJoined: 0, timeStamp: expect.any(Number)},
        {numDmsJoined: 1, timeStamp: expect.any(Number)}
      ], 
      messagesSent: [
        {numMessagesSent: 0, timeStamp: expect.any(Number)},
        {numMessagesSent: 1, timeStamp: expect.any(Number)},
        {numMessagesSent: 2, timeStamp: expect.any(Number)}
      ], 
      involvementRate: 0.75
    })
  });
})

describe('/users/stats/v1', () => {
  let user1: typeof USERID;
  let user2: typeof USERID;

  test('Invalid token', () => {
    expect(reqWorkplaceStatsV1('invalid token')).toStrictEqual(FORBIDDEN)
  })

  test('Empty case', () => {
    user1 = reqAuthRegisterV3('drac@vmail.com', 'bludsucka', 'Count', 'Dracula');
    var timeNow = Math.floor((new Date()).getTime() / MS);
    expect(reqWorkplaceStatsV1(user1.token)).toStrictEqual({
      channelsExist: [{numChannelsExist: 0, timeStamp: expect.any(Number)}],
      dmsExist: [{numDmsExist: 0, timeStamp: expect.any(Number)}],
      messagesExist: [{numMessagesExist: 0, timeStamp: expect.any(Number)}],
      utilizationRate: 0
    })
    expect(reqWorkplaceStatsV1(user1.token).channelsExist[0].timeStamp).toBeGreaterThanOrEqual(timeNow)
  })

  test('Combined Test', () => {
    user1 = reqAuthRegisterV3('drac@vmail.com', 'bludsucka', 'Count', 'Dracula');
    var timeNow1 = Math.floor((new Date()).getTime() / MS);
    var channel1 = reqChannelsCreateV3(user1.token, "CHANNEL1", true);
    reqChannelsCreateV3(user1.token, "CHANNEL2", true);
    reqChannelsCreateV3(user1.token, "CHANNEL3", true);
    user2 = reqAuthRegisterV3('2ndperson@gmail.com', 'password', 'Name', 'Last');
    var user3 = reqAuthRegisterV3('3rdperson@gmail.com', 'password', 'Name', 'Last');
    var user4 = reqAuthRegisterV3('4thperson@gmail.com', 'password', 'Name', 'Last');
    var dm = reqDmCreateV2(user1.token, [user2.authUserId] )
    var message = reqMessageSendV2(user1.token, channel1.channelId, "this is a message!")
    reqMessageSendDmV2(user1.token, dm.dmId, "this is a ANOTHER message!")
    expect(reqWorkplaceStatsV1(user1.token)).toStrictEqual({
      channelsExist: [
        {numChannelsExist: 0, timeStamp: expect.any(Number)},
        {numChannelsExist: 1, timeStamp: expect.any(Number)},
        {numChannelsExist: 2, timeStamp: expect.any(Number)},
        {numChannelsExist: 3, timeStamp: expect.any(Number)},
      ],
      dmsExist: [
        {numDmsExist: 0, timeStamp: expect.any(Number)},
        {numDmsExist: 1, timeStamp: expect.any(Number)}
      ],
      messagesExist: [
        {numMessagesExist: 0, timeStamp: expect.any(Number)},
        {numMessagesExist: 1, timeStamp: expect.any(Number)},
        {numMessagesExist: 2, timeStamp: expect.any(Number)},
      ],
      utilizationRate: 0.5
    })
    reqDmRemoveV2(user1.token, dm.dmId)
    reqMessageRemoveV2(user1.token, message.messageId)
    expect(reqWorkplaceStatsV1(user1.token)).toStrictEqual({
      channelsExist: [
        {numChannelsExist: 0, timeStamp: expect.any(Number)},
        {numChannelsExist: 1, timeStamp: expect.any(Number)},
        {numChannelsExist: 2, timeStamp: expect.any(Number)},
        {numChannelsExist: 3, timeStamp: expect.any(Number)},
      ],
      dmsExist: [
        {numDmsExist: 0, timeStamp: expect.any(Number)},
        {numDmsExist: 1, timeStamp: expect.any(Number)},
        {numDmsExist: 0, timeStamp: expect.any(Number)}
      ],
      messagesExist: [
        {numMessagesExist: 0, timeStamp: expect.any(Number)},
        {numMessagesExist: 1, timeStamp: expect.any(Number)},
        {numMessagesExist: 2, timeStamp: expect.any(Number)},
        {numMessagesExist: 1, timeStamp: expect.any(Number)},
        {numMessagesExist: 0, timeStamp: expect.any(Number)},
      ],
      utilizationRate: 0.25
    })
  });


});
