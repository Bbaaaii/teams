import {
  reqAuthRegisterV3,
  reqChannelsCreateV3,
  reqChannelDetailsV3,
  reqChannelJoinV3,
  reqChannelInviteV3,
  reqChannelMessagesV3,
  reqChannelAddOwnerV2,
  reqChannelRemoveOwnerV2,
  reqChannelLeaveV2,
  reqMessageSendV2,
  reqStandupStartV1,
  reqClearV1
} from '../src/requestHelpers';

import { BAD_REQUEST, FORBIDDEN } from '../src/httpsConsts';
import { AuthUserObject } from '../src/types/auth';
import { ChannelDetails, ChannelId } from '../src/types/channel';

type CHANNELID = { channelId: number }
type USERID = { authUserId: number, token: string }

beforeEach(() => {
  reqClearV1();
});

describe('/channel/details/v3', () => {
  let user1: USERID;
  let userId1: USERID;
  let user2: USERID;
  let userId2: USERID;
  let channel1: CHANNELID;
  let channelId1: number;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('email@gmail.com', 'password123', 'Some', 'Guy');
    user2 = reqAuthRegisterV3('anotheremail@gmail.com', 'password456', 'Another', 'Guy');
    if ('authUserId' in user1 && 'authUserId' in user2) {
      userId1 = user1;
      userId2 = user2;
    }
    channel1 = reqChannelsCreateV3(userId1.token, 'test channel', true);
    if ('channelId' in channel1) {
      channelId1 = channel1.channelId;
    }
  });

  describe('Invalid Parameters', () => {
    test('Invalid channelId', () => {
      expect(reqChannelDetailsV3(userId1.token, channelId1 + 1)).toStrictEqual(BAD_REQUEST);
    });
    test('Invalid userId', () => {
      expect(reqChannelDetailsV3('Random', channelId1)).toStrictEqual(FORBIDDEN); // Spec doesn't say whether this should be 403 or 400...
    });
    test('userId not member of channel', () => {
      expect(reqChannelDetailsV3(userId2.token, channelId1)).toStrictEqual(FORBIDDEN);
    });
  });

  describe('Valid Parameters', () => {
    test('Valid Parameters', () => {
      expect(reqChannelDetailsV3(userId1.token, channelId1)).toStrictEqual({
        name: 'test channel',
        isPublic: true,
        ownerMembers: [{
          uId: userId1.authUserId,
          email: 'email@gmail.com',
          nameFirst: 'Some',
          nameLast: 'Guy',
          profileImgUrl: expect.any(String),
          handleStr: 'someguy',
        }],
        allMembers: [{
          uId: userId1.authUserId,
          email: 'email@gmail.com',
          nameFirst: 'Some',
          nameLast: 'Guy',
          profileImgUrl: expect.any(String),
          handleStr: 'someguy',
        }],
      });
    });
  });
});

describe('channelJoinV3', () => {
  let user1: USERID;
  let userId1: USERID;
  let channel1: CHANNELID;
  let channelId1: number;
  describe('Invalid arguments', () => {
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'test123', 'John', 'Smith');
      if ('authUserId' in user1) {
        userId1 = user1;
      }
      channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
      if ('channelId' in channel1) {
        channelId1 = channel1.channelId;
      }
    });
    test('Invalid Channel', () => {
      const user2: USERID = reqAuthRegisterV3('example2@gmail.com', '123test', 'Dan', 'Smith');
      let userId2: USERID;
      if ('authUserId' in user2) {
        userId2 = user2;
      }
      expect(reqChannelJoinV3(userId2.token, channelId1 + 1)).toStrictEqual(BAD_REQUEST);
    });

    test('Invalid authUserId token', () => {
      const random = 'random';
      expect(reqChannelJoinV3(random, channelId1)).toStrictEqual(FORBIDDEN);
    });

    test('authUser already a member', () => {
      expect(reqChannelJoinV3(userId1.token, channelId1)).toStrictEqual(BAD_REQUEST);
    });

    test('channel is private and user is NOT the global owner', () => {
      const channel2: CHANNELID = reqChannelsCreateV3(userId1.token, 'MATH1131', false);
      let channelId2: number;
      if ('channelId' in channel2) {
        channelId2 = channel2.channelId;
      }
      const user2: USERID = reqAuthRegisterV3('example2@gmail.com', '123test', 'Dan', 'Smith');
      let userId2: USERID;
      if ('authUserId' in user2) {
        userId2 = user2;
      }
      expect(reqChannelJoinV3(userId2.token, channelId2)).toStrictEqual(FORBIDDEN);
    });
  });

  describe('Valid cases', () => {
    let user1: USERID;
    let userId1: USERID;
    let channel1: CHANNELID;
    let channelId1: number;
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'test123', 'John', 'Smith');
      if ('authUserId' in user1) {
        userId1 = user1;
      }
      channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
      if ('channelId' in channel1) {
        channelId1 = channel1.channelId;
      }
    });
    test('join user to public channel', () => {
      const user2: USERID = reqAuthRegisterV3('example2@gmail.com', '123test', 'Dan', 'Smith');
      let userId2: USERID;
      if ('authUserId' in user2) {
        userId2 = user2;
      }
      reqChannelJoinV3(userId2.token, channelId1);
      expect(reqChannelDetailsV3(userId1.token, channelId1)).toStrictEqual({
        name: 'COMP1531',
        isPublic: true,
        ownerMembers: [
          {
            uId: userId1.authUserId,
            email: 'example@gmail.com',
            nameFirst: 'John',
            nameLast: 'Smith',
            handleStr: 'johnsmith',
            profileImgUrl: expect.any(String),
          }
        ],
        allMembers: [
          {
            uId: userId1.authUserId,
            email: 'example@gmail.com',
            nameFirst: 'John',
            nameLast: 'Smith',
            handleStr: 'johnsmith',
            profileImgUrl: expect.any(String),
          },
          {
            uId: userId2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Dan',
            nameLast: 'Smith',
            handleStr: 'dansmith',
            profileImgUrl: expect.any(String),
          },
        ]
      });
    });

    test('join global owner to private channel', () => {
      const user2: USERID = reqAuthRegisterV3('example2@gmail.com', '123test', 'Dan', 'Smith');
      let userId2: USERID;
      if ('authUserId' in user2) {
        userId2 = user2;
      }
      const channel2: CHANNELID = reqChannelsCreateV3(userId2.token, 'MATH1131', false);
      let channelId2: number;
      if ('channelId' in channel2) {
        channelId2 = channel2.channelId;
      }
      reqChannelJoinV3(userId1.token, channelId2);
      expect(reqChannelDetailsV3(userId2.token, channelId2)).toStrictEqual({
        name: 'MATH1131',
        isPublic: false,
        ownerMembers: [{
          uId: userId2.authUserId,
          email: 'example2@gmail.com',
          nameFirst: 'Dan',
          nameLast: 'Smith',
          handleStr: 'dansmith',
          profileImgUrl: expect.any(String),
        }],
        allMembers: [{
          uId: userId2.authUserId,
          email: 'example2@gmail.com',
          nameFirst: 'Dan',
          nameLast: 'Smith',
          handleStr: 'dansmith',
          profileImgUrl: expect.any(String),
        },
        {
          uId: userId1.authUserId,
          email: 'example@gmail.com',
          nameFirst: 'John',
          nameLast: 'Smith',
          handleStr: 'johnsmith',
          profileImgUrl: expect.any(String),
        }]
      });
    });
  });
});

describe('/channel/invite/v3', () => {
  describe('Invalid arguments', () => {
    let owner1: USERID;
    let ownerId1: USERID;
    let invitedUser1: USERID;
    let invitedUserId1: USERID;
    let channel1: CHANNELID;
    let channelId1: number;
    beforeEach(() => {
      owner1 = reqAuthRegisterV3('example@gmail.com', 'IamCool', 'Jack', 'Sparrow');
      invitedUser1 = reqAuthRegisterV3('generic@hotmail.com', 'Striker', 'Bruce', 'Wayne');
      if ('authUserId' in owner1 && 'authUserId' in invitedUser1) {
        ownerId1 = owner1;
        invitedUserId1 = invitedUser1;
      }
      channel1 = reqChannelsCreateV3(ownerId1.token, 'COMP1531', true);
      if ('channelId' in channel1) {
        channelId1 = channel1.channelId;
      }
    });

    test('Invalid Channel', () => {
      expect(reqChannelInviteV3(ownerId1.token, channelId1 + 1, invitedUserId1.authUserId)).toStrictEqual(BAD_REQUEST);
    });

    test('Invalid authUserId token', () => {
      expect(reqChannelInviteV3('random', channelId1, invitedUserId1.authUserId)).toStrictEqual(FORBIDDEN);
    });

    test('Invalid uId', () => {
      expect(reqChannelInviteV3(ownerId1.token, channelId1, invitedUserId1.authUserId + 1)).toStrictEqual(BAD_REQUEST);
    });

    test('Inviter not a member of channel', () => {
      const randomUser: USERID = reqAuthRegisterV3('hello@hotmail.com', 'Cabey124', 'Ben', 'Johnson');
      let randomUserId: USERID;
      if ('authUserId' in randomUser) {
        randomUserId = randomUser;
      }
      expect(reqChannelInviteV3(randomUserId.token, channelId1, invitedUserId1.authUserId)).toStrictEqual(FORBIDDEN);
    });

    test('Inviting existing member of channel', () => {
      expect(reqChannelInviteV3(ownerId1.token, channelId1, ownerId1.authUserId)).toStrictEqual(BAD_REQUEST);
      reqChannelJoinV3(invitedUserId1.token, channelId1);
      expect(reqChannelInviteV3(ownerId1.token, channelId1, invitedUserId1.authUserId)).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid cases', () => {
    let owner2: USERID;
    let ownerId2: USERID;
    let invitedUser2: USERID;
    let invitedUserId2: USERID;
    let channel2: CHANNELID;
    let channelId2: number;
    beforeEach(() => {
      owner2 = reqAuthRegisterV3('example2@gmail.com', 'pizza123', 'Joel', 'Sparrow');
      invitedUser2 = reqAuthRegisterV3('simple@outlook.com', 'Striker', 'Bruce', 'Wayne');
      if ('authUserId' in owner2 && 'authUserId' in invitedUser2) {
        ownerId2 = owner2;
        invitedUserId2 = invitedUser2;
      }
      channel2 = reqChannelsCreateV3(ownerId2.token, 'COMP1531', true);
      if ('channelId' in channel2) {
        channelId2 = channel2.channelId;
      }
    });

    test('Inviting valid user to public channel', () => {
      expect(reqChannelInviteV3(ownerId2.token, channelId2, invitedUserId2.authUserId)).toStrictEqual({});
      expect(reqChannelDetailsV3(ownerId2.token, channelId2)).toStrictEqual({
        name: 'COMP1531',
        isPublic: true,
        ownerMembers: [
          {
            uId: ownerId2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Joel',
            nameLast: 'Sparrow',
            handleStr: 'joelsparrow',
            profileImgUrl: expect.any(String),
          }
        ],
        allMembers: [
          {
            uId: ownerId2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Joel',
            nameLast: 'Sparrow',
            handleStr: 'joelsparrow',
            profileImgUrl: expect.any(String),
          },
          {
            uId: invitedUserId2.authUserId,
            email: 'simple@outlook.com',
            nameFirst: 'Bruce',
            nameLast: 'Wayne',
            handleStr: 'brucewayne',
            profileImgUrl: expect.any(String),
          }
        ],
      });
    });

    test('Inviting valid user to private channel', () => {
      const channel3 = reqChannelsCreateV3(ownerId2.token, 'COMP2511', false);
      let channelId3: number;
      if ('channelId' in channel3) {
        channelId3 = channel3.channelId;
      }
      expect(reqChannelInviteV3(ownerId2.token, channelId3, invitedUserId2.authUserId)).toStrictEqual({});
      expect(reqChannelDetailsV3(invitedUserId2.token, channelId3)).toStrictEqual({
        name: 'COMP2511',
        isPublic: false,
        ownerMembers: [
          {
            uId: ownerId2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Joel',
            nameLast: 'Sparrow',
            handleStr: 'joelsparrow',
            profileImgUrl: expect.any(String),
          }
        ],
        allMembers: [
          {
            uId: ownerId2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Joel',
            nameLast: 'Sparrow',
            handleStr: 'joelsparrow',
            profileImgUrl: expect.any(String),
          },
          {
            uId: invitedUserId2.authUserId,
            email: 'simple@outlook.com',
            nameFirst: 'Bruce',
            nameLast: 'Wayne',
            handleStr: 'brucewayne',
            profileImgUrl: expect.any(String),
          }
        ],
      });
    });

    test('non-owner member inviting user to channel', () => {
      reqChannelJoinV3(invitedUserId2.token, channelId2);
      const invitedUser3 = reqAuthRegisterV3('dogs@outlook.com', 'Sydney', 'Bob', 'Builder');
      let invitedUserId3: USERID;
      if ('authUserId' in invitedUser3) {
        invitedUserId3 = invitedUser3;
      }
      expect(reqChannelInviteV3(invitedUserId2.token, channelId2, invitedUserId3.authUserId)).toStrictEqual({});
      expect(reqChannelDetailsV3(invitedUserId3.token, channelId2)).toStrictEqual({
        name: 'COMP1531',
        isPublic: true,
        ownerMembers: [
          {
            uId: ownerId2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Joel',
            nameLast: 'Sparrow',
            handleStr: 'joelsparrow',
            profileImgUrl: expect.any(String),
          }
        ],
        allMembers: [
          {
            uId: ownerId2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Joel',
            nameLast: 'Sparrow',
            handleStr: 'joelsparrow',
            profileImgUrl: expect.any(String),
          },
          {
            uId: invitedUserId2.authUserId,
            email: 'simple@outlook.com',
            nameFirst: 'Bruce',
            nameLast: 'Wayne',
            handleStr: 'brucewayne',
            profileImgUrl: expect.any(String),
          },
          {
            uId: invitedUserId3.authUserId,
            email: 'dogs@outlook.com',
            nameFirst: 'Bob',
            nameLast: 'Builder',
            handleStr: 'bobbuilder',
            profileImgUrl: expect.any(String),
          }
        ],
      });
    });
  });
});

describe('/channel/messages/v3', () => {
  describe('Invalid arguments', () => {
    let user1: USERID;
    let userId1: USERID;
    let channel1: CHANNELID;
    let channelId1: number;
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'cats1234', 'Jack', 'Rabbit');
      if ('authUserId' in user1) {
        userId1 = user1;
      }
      channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
      if ('channelId' in channel1) {
        channelId1 = channel1.channelId;
      }
    });

    test('Invalid Channel', () => {
      expect(reqChannelMessagesV3(userId1.token, channelId1 + 1, 0)).toStrictEqual(BAD_REQUEST);
    });

    test('Invalid authUserId token', () => {
      expect(reqChannelMessagesV3('random', channelId1, 0)).toStrictEqual(FORBIDDEN);
    });

    test('start index greater than total channel messages', () => {
      expect(reqChannelMessagesV3(userId1.token, channelId1, 50)).toStrictEqual(BAD_REQUEST);
      expect(reqChannelMessagesV3(userId1.token, channelId1, 20)).toStrictEqual(BAD_REQUEST);
      expect(reqChannelMessagesV3(userId1.token, channelId1, 1)).toStrictEqual(BAD_REQUEST);
    });

    test('auth member not part of channel', () => {
      const user2 = reqAuthRegisterV3('sample@gmail.com', 'securepassword', 'Seb', 'Ryan');
      let userId2: USERID;
      if ('authUserId' in user2) {
        userId2 = user2;
      }
      expect(reqChannelMessagesV3(userId2.token, channelId1, 0)).toStrictEqual(FORBIDDEN);
    });
  });

  describe('Valid cases', () => {
    let owner: USERID;
    let ownerId: USERID;
    let channel: CHANNELID;
    let channelId: number;
    beforeEach(() => {
      owner = reqAuthRegisterV3('simple2@gmail.com', 'username', 'Ben', 'bryant');
      if ('authUserId' in owner) {
        ownerId = owner;
      }
      channel = reqChannelsCreateV3(ownerId.token, 'COMP1531', true);
      if ('channelId' in channel) {
        channelId = channel.channelId;
      }
    });

    test('empty case with channel owner', () => {
      expect(reqChannelMessagesV3(ownerId.token, channelId, 0)).toStrictEqual({
        messages: [],
        start: 0,
        end: -1,
      });
    });

    test('empty case with non-owner member', () => {
      const member = reqAuthRegisterV3('hi123@gmail.com', 'happy3456', 'Tom', 'Prince');
      let memberId: USERID;
      if ('authUserId' in member) {
        memberId = member;
      }
      reqChannelJoinV3(memberId.token, channelId);
      expect(reqChannelMessagesV3(memberId.token, channelId, 0)).toStrictEqual({
        messages: [],
        start: 0,
        end: -1,
      });
    });

    test('empty case negative start indexes', () => {
      for (let i = -1; i > -7; i--) {
        expect(reqChannelMessagesV3(ownerId.token, channelId, i)).toStrictEqual({
          messages: [],
          start: i,
          end: -1,
        });
      }
    });

    test('testing end index', () => {
      for (let i = 0; i < 100; i++) {
        reqMessageSendV2(ownerId.token, channelId, 'hello');
      }
      const request = reqChannelMessagesV3(ownerId.token, channelId, 3);
      expect(request.end).toEqual(53);
    });
  });
});

describe('/channel/leave/v2', () => {
  describe('Invalid arguments', () => {
    let user1: USERID;
    let userId1: USERID;
    let channel1: CHANNELID;
    let channelId1: number;
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'test123', 'John', 'Smith');
      if ('authUserId' in user1) {
        userId1 = user1;
      }
      channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
      if ('channelId' in channel1) {
        channelId1 = channel1.channelId;
      }
    });
    test('Invalid Channel', () => {
      expect(reqChannelLeaveV2(userId1.token, channelId1 + 1)).toStrictEqual(BAD_REQUEST);
    });

    test('Member not a part of the channel', () => {
      const user2: USERID = reqAuthRegisterV3('example2@gmail.com', '123test', 'Dan', 'Smith');
      let userId2: USERID;
      if ('authUserId' in user2) {
        userId2 = user2;
      }
      expect(reqChannelLeaveV2(userId2.token, channelId1)).toStrictEqual(FORBIDDEN);
    });

    test('Invalid token', () => {
      const invalid = 'invalid token';
      expect(reqChannelLeaveV2(invalid, channelId1)).toStrictEqual(FORBIDDEN);
    });

    test('Active standup', () => {
      reqStandupStartV1(userId1.token, channelId1, 5);
      expect(reqChannelLeaveV2(userId1.token, channelId1)).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid cases', () => {
    let user1: USERID;
    let userId1: USERID;
    let channel1: CHANNELID;
    let channelId1: number;
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'test123', 'John', 'Smith');
      if ('authUserId' in user1) {
        userId1 = user1;
      }
      channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
      if ('channelId' in channel1) {
        channelId1 = channel1.channelId;
      }
    });
    test('Remove a user from a channel', () => {
      const user2: USERID = reqAuthRegisterV3('example2@gmail.com', '123test', 'Dan', 'Smith');
      let userId2: USERID;
      if ('authUserId' in user2) {
        userId2 = user2;
      }
      reqChannelJoinV3(userId2.token, channelId1);
      reqChannelLeaveV2(userId2.token, channelId1);
      expect(reqChannelDetailsV3(userId1.token, channelId1)).toStrictEqual({
        name: 'COMP1531',
        isPublic: true,
        ownerMembers: [
          {
            uId: userId1.authUserId,
            email: 'example@gmail.com',
            nameFirst: 'John',
            nameLast: 'Smith',
            handleStr: 'johnsmith',
            profileImgUrl: expect.any(String),
          }
        ],
        allMembers: [
          {
            uId: userId1.authUserId,
            email: 'example@gmail.com',
            nameFirst: 'John',
            nameLast: 'Smith',
            handleStr: 'johnsmith',
            profileImgUrl: expect.any(String),
          },
        ]
      });
    });
    test('No owners remain in channel', () => {
      const user2: USERID = reqAuthRegisterV3('example2@gmail.com', '123test', 'Dan', 'Smith');
      let userId2: USERID;
      if ('authUserId' in user2) {
        userId2 = user2;
      }
      reqChannelJoinV3(userId2.token, channelId1);
      reqChannelLeaveV2(userId1.token, channelId1);
      expect(reqChannelDetailsV3(userId2.token, channelId1)).toStrictEqual({
        name: 'COMP1531',
        isPublic: true,
        ownerMembers: [],
        allMembers: [
          {
            uId: userId2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Dan',
            nameLast: 'Smith',
            handleStr: 'dansmith',
            profileImgUrl: expect.any(String),
          },
        ],
      });
    });
  });
});

describe('/channel/addowner/v2', () => {
  let user1: USERID;
  let userId1: USERID;
  let user2: USERID;
  let userId2: USERID;
  let channel1: CHANNELID;
  let channelId1: number;
  describe('invalid arguments', () => {
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'test123', 'John', 'Smith');
      if ('authUserId' in user1) {
        userId1 = user1;
      }
      channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
      if ('channelId' in channel1) {
        channelId1 = channel1.channelId;
      }
      user2 = reqAuthRegisterV3('example2@gmail.com', '123test', 'Dan', 'Smith');
      if ('authUserId' in user2) {
        userId2 = user2;
      }
    });
    // channelJoinV2 is left out of beforeeach to allow easy testing of when a member is not part of the channel
    test('Invalid channel', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      expect(reqChannelAddOwnerV2(userId1.token, channelId1 + 1, userId2.authUserId)).toStrictEqual(BAD_REQUEST);
    });
    test('Invalid userId', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      expect(reqChannelAddOwnerV2(userId1.token, channelId1, userId2.authUserId + 1)).toStrictEqual(BAD_REQUEST);
    });
    test('Invalid Token', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      const invalidToken = 'invalid token';
      expect(reqChannelAddOwnerV2(invalidToken, channelId1, userId2.authUserId)).toStrictEqual(FORBIDDEN);
    });
    test('User is not a member of channel', () => {
      expect(reqChannelAddOwnerV2(userId1.token, channelId1, userId2.authUserId)).toStrictEqual(BAD_REQUEST);
    });
    test('Already an owner', () => {
      expect(reqChannelAddOwnerV2(userId1.token, channelId1, userId1.authUserId)).toStrictEqual(BAD_REQUEST);
    });
    test('Auth user does not have owner permissions', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      expect(reqChannelAddOwnerV2(userId2.token, channelId1, userId2.authUserId)).toStrictEqual(FORBIDDEN);
    });
  });
  describe('Valid cases', () => {
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'test123', 'John', 'Smith');
      if ('authUserId' in user1) {
        userId1 = user1;
      }
      channel1 = reqChannelsCreateV3(userId1.token, 'COMP1531', true);
      if ('channelId' in channel1) {
        channelId1 = channel1.channelId;
      }
      user2 = reqAuthRegisterV3('example2@gmail.com', '123test', 'Dan', 'Smith');
      if ('authUserId' in user2) {
        userId2 = user2;
      }
    });
    test('Turn a user into an owner', () => {
      reqChannelJoinV3(userId2.token, channelId1);
      reqChannelAddOwnerV2(userId1.token, channelId1, userId2.authUserId);
      expect(reqChannelDetailsV3(userId1.token, channelId1)).toStrictEqual({
        name: 'COMP1531',
        isPublic: true,
        ownerMembers: [
          {
            uId: userId1.authUserId,
            email: 'example@gmail.com',
            nameFirst: 'John',
            nameLast: 'Smith',
            handleStr: 'johnsmith',
            profileImgUrl: expect.any(String),
          },
          {
            uId: userId2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Dan',
            nameLast: 'Smith',
            handleStr: 'dansmith',
            profileImgUrl: expect.any(String),
          },
        ],
        allMembers: [
          {
            uId: userId1.authUserId,
            email: 'example@gmail.com',
            nameFirst: 'John',
            nameLast: 'Smith',
            handleStr: 'johnsmith',
            profileImgUrl: expect.any(String),
          },
          {
            uId: userId2.authUserId,
            email: 'example2@gmail.com',
            nameFirst: 'Dan',
            nameLast: 'Smith',
            handleStr: 'dansmith',
            profileImgUrl: expect.any(String),
          },
        ]
      });
    });
  });
});

describe('/channel/removeowner/v2', () => {
  let user1: AuthUserObject;
  let user2: AuthUserObject;
  let user3: AuthUserObject;
  let user4: AuthUserObject;
  let channel1: ChannelId;
  let invaliduId: number;
  describe('Invalid arguments', () => {
    beforeEach(() => {
      user1 = reqAuthRegisterV3('dude@gmail.com', 'password123', 'man', 'bro');
      user2 = reqAuthRegisterV3('dude1@gmail.com', 'password123', 'man', 'bro');
      user3 = reqAuthRegisterV3('dude2@gmail.com', 'password123', 'man', 'bro');
      user4 = reqAuthRegisterV3('dude3@gmail.com', 'password123', 'man', 'bro');

      channel1 = reqChannelsCreateV3(user1.token, 'COMP1531', true);

      reqChannelJoinV3(user4.token, channel1.channelId);

      reqChannelAddOwnerV2(user1.token, channel1.channelId, user4.authUserId);
      reqChannelJoinV3(user2.token, channel1.channelId);
      reqChannelJoinV3(user3.token, channel1.channelId);
      invaliduId = Math.max(user1.authUserId, user2.authUserId, user3.authUserId, user4.authUserId) + 1;
    });

    test('Invalid channel', () => {
      expect(reqChannelRemoveOwnerV2(user1.token, channel1.channelId + 1, user2.authUserId)).toStrictEqual(BAD_REQUEST);
    });
    test('Invalid uId', () => {
      expect(reqChannelRemoveOwnerV2(user1.token, channel1.channelId, invaliduId)).toStrictEqual(BAD_REQUEST);
    });
    test('Invalid token', () => {
      expect(reqChannelRemoveOwnerV2('invalidToken', channel1.channelId, user2.authUserId)).toStrictEqual(FORBIDDEN);
    });
    test('uId user is not a channel owner', () => {
      expect(reqChannelRemoveOwnerV2(user2.token, channel1.channelId, user3.authUserId)).toStrictEqual(FORBIDDEN);
    });
    test('Demoter is not a channel owner', () => {
      expect(reqChannelRemoveOwnerV2(user3.token, channel1.channelId, user4.authUserId)).toStrictEqual(FORBIDDEN);
    });
    test('uId is only owner', () => {
      expect(reqChannelRemoveOwnerV2(user1.token, channel1.channelId, user4.authUserId)).toStrictEqual({});
      expect(reqChannelRemoveOwnerV2(user1.token, channel1.channelId, user1.authUserId)).toStrictEqual(BAD_REQUEST);
      // reqChannelAddOwnerV2(user1.token, channel1.channelId, user4.authUserId);
    });
  });
  describe('Valid case', () => {
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'test123', 'John', 'Smith');
      user2 = reqAuthRegisterV3('example2@gmail.com', '123test', 'Dan', 'Smith');

      channel1 = reqChannelsCreateV3(user1.token, 'COMP1531', true);

      reqChannelJoinV3(user2.token, channel1.channelId);
      reqChannelAddOwnerV2(user1.token, channel1.channelId, user2.authUserId);
    });

    afterAll(() => {
      reqClearV1();
    });
    test('Remove an owner', () => {
      expect(reqChannelRemoveOwnerV2(user1.token, channel1.channelId, user1.authUserId));

      const channelDetails: ChannelDetails = reqChannelDetailsV3(user2.token, channel1.channelId);

      expect(channelDetails.ownerMembers).toHaveLength(1);
      expect(channelDetails.ownerMembers[0].uId).toBe(user2.authUserId);
    });
  });
});
