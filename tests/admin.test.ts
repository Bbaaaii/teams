import { DEFAULT_PROFILE_IMG } from '../src/helper';
import { BAD_REQUEST, FORBIDDEN } from '../src/httpsConsts';
import { reqAdminUserPermissionChangeV1, reqAdminUserRemoveV1, reqAuthRegisterV3, reqChannelAddOwnerV2, reqChannelJoinV3, reqChannelsCreateV3, reqClearV1, reqUserProfileV3 } from '../src/requestHelpers';
import { AuthUserObject } from '../src/types/auth';

import { Permission } from '../src/types/users';

describe('admin/userpermission/change/v1', () => {
  let originalGlobalOwner: AuthUserObject;
  let secondUser: AuthUserObject;
  let thirdUser: AuthUserObject;
  let fourthUser: AuthUserObject;
  let invalidId: number;
  let channelId: number;

  beforeAll(() => {
    reqClearV1();

    originalGlobalOwner = reqAuthRegisterV3('chinko@gmail.com', 'sukebe123_', 'Chinko', 'Man');
    secondUser = reqAuthRegisterV3('teman@gmail.com', 'yari123chin', 'Narita', 'Yusuke');
    thirdUser = reqAuthRegisterV3('debu@gmail.com', 'yari123man', 'Kupaa', 'Sama');
    fourthUser = reqAuthRegisterV3('god@god.com', 'god12ddfse3', 'God', 'God');
    invalidId = Math.max(originalGlobalOwner.authUserId, secondUser.authUserId, thirdUser.authUserId, fourthUser.authUserId) + 1;

    // add all to channel to test permissions
    channelId = reqChannelsCreateV3(originalGlobalOwner.token, 'test channel', true).channelId;
    expect(reqChannelJoinV3(secondUser.token, channelId)).toStrictEqual({});
    expect(reqChannelJoinV3(thirdUser.token, channelId)).toStrictEqual({});
    expect(reqChannelJoinV3(fourthUser.token, channelId)).toStrictEqual({});
  });

  afterAll(() => {
    reqClearV1();
  });

  describe('Invalid Requests', () => {
    test('Invalid token', () => {
      expect(reqAdminUserPermissionChangeV1('invalid token', originalGlobalOwner.authUserId, Permission.OWNER)).toStrictEqual(FORBIDDEN);
    });

    test('Not global owner', () => {
      expect(reqAdminUserPermissionChangeV1(secondUser.token, secondUser.authUserId, Permission.OWNER)).toStrictEqual(FORBIDDEN);
    });

    test('Invalid user id', () => {
      expect(reqAdminUserPermissionChangeV1(originalGlobalOwner.token, invalidId, Permission.OWNER)).toStrictEqual(BAD_REQUEST);
    });

    test('Invalid permission id', () => {
      expect(reqAdminUserPermissionChangeV1(originalGlobalOwner.token, secondUser.authUserId, -1)).toStrictEqual(BAD_REQUEST);
    });

    test('Already has permission', () => {
      expect(reqAdminUserPermissionChangeV1(originalGlobalOwner.token, originalGlobalOwner.authUserId, Permission.OWNER)).toStrictEqual(BAD_REQUEST);
    });

    test('Demoting ONLY global owner', () => {
      expect(reqAdminUserPermissionChangeV1(originalGlobalOwner.token, originalGlobalOwner.authUserId, Permission.MEMBER)).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid Requests', () => {
    test('Promoting to global owner', () => {
      expect(reqAdminUserPermissionChangeV1(originalGlobalOwner.token, secondUser.authUserId, Permission.OWNER)).toStrictEqual({});
      // can change other person to channel owner?
      expect(reqChannelAddOwnerV2(secondUser.token, channelId, thirdUser.authUserId)).toStrictEqual({});
    });

    test('Demoting to member', () => {
      expect(reqAdminUserPermissionChangeV1(secondUser.token, secondUser.authUserId, Permission.MEMBER)).toStrictEqual({});
      // can change other person to channel owner?
      expect(reqChannelAddOwnerV2(secondUser.token, channelId, fourthUser.authUserId)).toStrictEqual(FORBIDDEN);
    });
  });
});

describe('admin/user/remove/v1', () => {
  let globalOwner: AuthUserObject;
  let secondUser: AuthUserObject;

  let invalidId: number;

  beforeAll(() => {
    reqClearV1();
    globalOwner = reqAuthRegisterV3('cats@gmail.com', 'passwrod123', 'namer', 'last');
    secondUser = reqAuthRegisterV3('trees@gmail.com', 'yeetwords123', 'cool', 'epic');

    invalidId = Math.max(globalOwner.authUserId, secondUser.authUserId) + 1;
  });

  afterAll(() => {
    reqClearV1();
  });

  describe('Invalid Requests', () => {
    test('Invalid token', () => {
      expect(reqAdminUserRemoveV1('invalid token', secondUser.authUserId)).toStrictEqual(FORBIDDEN);
    });

    test('Not global owner', () => {
      expect(reqAdminUserRemoveV1(secondUser.token, secondUser.authUserId)).toStrictEqual(FORBIDDEN);
    });

    test('Invalid user id', () => {
      expect(reqAdminUserRemoveV1(globalOwner.token, invalidId)).toStrictEqual(BAD_REQUEST);
    });

    test('Removing ONLY global owner', () => {
      expect(reqAdminUserRemoveV1(globalOwner.token, globalOwner.authUserId)).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid Requests', () => {
    test('Removing user', () => {
      expect(reqAdminUserRemoveV1(globalOwner.token, secondUser.authUserId)).toStrictEqual({});
      expect(reqUserProfileV3(globalOwner.token, secondUser.authUserId)).toStrictEqual(
        {
          user: {
            uId: secondUser.authUserId,
            nameFirst: 'Removed',
            nameLast: 'user',
            email: 'trees@gmail.com',
            profileImgUrl: DEFAULT_PROFILE_IMG,
            handleStr: 'coolepic'
          }
        }
      );
    });
  });
});
