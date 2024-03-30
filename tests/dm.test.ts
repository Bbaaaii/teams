import {
  reqAuthRegisterV3,
  reqDmCreateV2,
  reqDmListV2,
  reqDmRemoveV2,
  reqDmDetailsV2,
  reqDmLeaveV2,
  reqDmMessagesV2,
  reqMessageSendDmV2,
  reqUserProfileV3,
  reqClearV1,
} from '../src/requestHelpers';

import { BAD_REQUEST, FORBIDDEN } from '../src/httpsConsts';

type AuthUserObject = { authUserId: number, token: string };
type DmCreateObject = { dmId: number };
type USERID = { authUserId: number, token: string }

// Extracted from src\dm.ts
type DM = { dmId: number, name: string };

// We need to clear the data store before each test to prevent unexpected behaviour related to previous contamination
beforeEach(() => {
  reqClearV1();
});

describe('/dm/create/v2', () => {
  let user1: AuthUserObject;
  let user2: AuthUserObject;
  let user3: AuthUserObject;
  let invalidId: number;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('A@gmail.com', 'password', 'A', 'Surname');
    user2 = reqAuthRegisterV3('B@gmail.com', 'password', 'B', 'Surname');
    user3 = reqAuthRegisterV3('C@gmail.com', 'password', 'C', 'Surname');

    invalidId = Math.max(user1.authUserId, user2.authUserId, user3.authUserId) + 1;
  });

  test('Invalid Token', () => {
    const res = reqDmCreateV2('incorrect token!', [] as number[]);
    expect(res).toStrictEqual(FORBIDDEN);
  });

  test('Invalid User', () => {
    const res = reqDmCreateV2(user1.token, [user2.authUserId, invalidId] as number[]);
    expect(res).toStrictEqual(BAD_REQUEST);
  });

  test('Duplicate Users', () => {
    const res = reqDmCreateV2(user1.token, [user1.authUserId]);
    expect(res).toStrictEqual(BAD_REQUEST);

    const res2 = reqDmCreateV2(user1.token, [user2.authUserId, user2.authUserId] as number[]);
    expect(res2).toStrictEqual(BAD_REQUEST);
  });

  test('Valid Input Basic', () => {
    const res = reqDmCreateV2(user1.token, [user2.authUserId] as number[]);
    expect(res).toStrictEqual({ dmId: expect.any(Number) });
    expect(reqDmDetailsV2(user1.token, res.dmId).name).toStrictEqual('asurname, bsurname');
  });

  test('Valid Input 1 User', () => {
    const res = reqDmCreateV2(user1.token, [] as number[]);
    expect(res).toStrictEqual({ dmId: expect.any(Number) });
    expect(reqDmDetailsV2(user1.token, res.dmId).name).toStrictEqual('asurname');
  });

  test('Valid Input 3 Users', () => {
    const res = reqDmCreateV2(user1.token, [user2.authUserId, user3.authUserId] as number[]);
    expect(res).toStrictEqual({ dmId: expect.any(Number) });

    const res2 = reqDmCreateV2(user3.token, [user2.authUserId, user1.authUserId] as number[]);
    expect(res2).toStrictEqual({ dmId: expect.any(Number) });

    expect(reqDmDetailsV2(user2.token, res.dmId).name).toStrictEqual('asurname, bsurname, csurname');
    expect(reqDmDetailsV2(user3.token, res.dmId).name).toStrictEqual('asurname, bsurname, csurname');
  });
});

describe('/dm/list/v2', () => {
  let user1: AuthUserObject;
  let user2: AuthUserObject;
  let user3: AuthUserObject;

  let dmid1: DmCreateObject;
  let dmid2: DmCreateObject;
  let dmid3: DmCreateObject;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('A@gmail.com', 'password', 'A', 'Surname');
    user2 = reqAuthRegisterV3('B@gmail.com', 'password', 'B', 'Surname');
    user3 = reqAuthRegisterV3('C@gmail.com', 'password', 'C', 'Surname');

    dmid1 = reqDmCreateV2(user1.token, [user2.authUserId, user3.authUserId] as number[]);
    dmid2 = reqDmCreateV2(user3.token, [user2.authUserId, user1.authUserId] as number[]);
    dmid3 = reqDmCreateV2(user3.token, [user2.authUserId] as number[]);
  });

  test('Invalid Token', () => {
    const res = reqDmListV2('incorrect token!');
    expect(res).toStrictEqual(FORBIDDEN);
  });

  test('Valid Input', () => {
    const res1 = reqDmListV2(user1.token);
    expect(res1).toStrictEqual({
      dms: [
        {
          dmId: dmid1.dmId,
          name: 'asurname, bsurname, csurname'
        },
        {
          dmId: dmid2.dmId,
          name: 'asurname, bsurname, csurname'
        },
      ]
    });

    const res2 = reqDmListV2(user2.token);
    expect(res2).toStrictEqual({
      dms: [
        {
          dmId: dmid1.dmId,
          name: 'asurname, bsurname, csurname'
        },
        {
          dmId: dmid2.dmId,
          name: 'asurname, bsurname, csurname'
        },
        {
          dmId: dmid3.dmId,
          name: 'bsurname, csurname'
        },
      ]
    });
  });
});

describe('/dm/remove/v2', () => {
  let user1: AuthUserObject;
  let user2: AuthUserObject;
  let user3: AuthUserObject;

  let dmid1: DmCreateObject;
  let dmid2: DmCreateObject;
  let dmid3: DmCreateObject;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('A@gmail.com', 'password', 'A', 'Surname');
    user2 = reqAuthRegisterV3('B@gmail.com', 'password', 'B', 'Surname');
    user3 = reqAuthRegisterV3('C@gmail.com', 'password', 'C', 'Surname');

    dmid1 = reqDmCreateV2(user1.token, [user2.authUserId, user3.authUserId] as number[]);
    dmid2 = reqDmCreateV2(user3.token, [user2.authUserId, user1.authUserId] as number[]);
    dmid3 = reqDmCreateV2(user3.token, [user2.authUserId] as number[]);
  });

  test('Invalid Token', () => {
    const res = reqDmRemoveV2(user1.token + user2.token + user3.token, dmid1.dmId);
    expect(res).toStrictEqual(FORBIDDEN);
  });

  test('Invalid Dm Id', () => {
    const res = reqDmRemoveV2(user1.token, Math.max(dmid1.dmId + dmid2.dmId + dmid3.dmId) + 1);
    expect(res).toStrictEqual(BAD_REQUEST);
  });

  test('Valid Dm, user is not owner', () => {
    const res = reqDmRemoveV2(user2.token, dmid1.dmId);
    expect(res).toStrictEqual(FORBIDDEN);
  });

  test('Valid Dm, user is not in dm', () => {
    const res = reqDmRemoveV2(user1.token, dmid3.dmId);
    expect(res).toStrictEqual(FORBIDDEN);
  });

  // valid dm, owner leaves and tries to remove (produces error)

  test('Valid Dm, user is owner', () => {
    const res = reqDmRemoveV2(user1.token, dmid1.dmId);
    expect(res).toStrictEqual({});

    expect(reqDmListV2(user1.token).dms).toHaveLength(1);
    expect(reqDmListV2(user2.token).dms).toHaveLength(2);
    expect(reqDmListV2(user3.token).dms).toHaveLength(2);

    expect(reqDmListV2(user1.token).dms.map((dm: DM) => dm.dmId)).not.toContain(dmid1.dmId);
  });
});

describe('/dm/details/v2', () => {
  let user1: AuthUserObject;
  let user2: AuthUserObject;
  let user3: AuthUserObject;

  let dmid1: DmCreateObject;
  let dmid2: DmCreateObject;
  let dmid3: DmCreateObject;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('A@gmail.com', 'password', 'A', 'Surname');
    user2 = reqAuthRegisterV3('B@gmail.com', 'password', 'B', 'Surname');
    user3 = reqAuthRegisterV3('C@gmail.com', 'password', 'C', 'Surname');
    dmid1 = reqDmCreateV2(user1.token, [user2.authUserId, user3.authUserId] as number[]);
    dmid2 = reqDmCreateV2(user3.token, [user2.authUserId, user1.authUserId] as number[]);
    dmid3 = reqDmCreateV2(user3.token, [user2.authUserId] as number[]);
  });

  test('Invalid Dm Id', () => {
    const res = reqDmDetailsV2(user1.token, Math.max(dmid1.dmId, dmid2.dmId, dmid3.dmId) + 1);
    expect(res).toStrictEqual(BAD_REQUEST);
  });

  test('Invalid Token', () => {
    const res = reqDmDetailsV2(user1.token + user2.token + user3.token, dmid1.dmId);
    expect(res).toStrictEqual(FORBIDDEN);
  });

  test('User Not Member', () => {
    const res = reqDmDetailsV2(user1.token, dmid3.dmId);
    expect(res).toStrictEqual(FORBIDDEN);
  });

  test('Valid Input', () => {
    const res = reqDmDetailsV2(user1.token, dmid1.dmId);
    expect(res).toStrictEqual({
      name: 'asurname, bsurname, csurname',
      members: [
        reqUserProfileV3(user1.token, user1.authUserId).user,
        reqUserProfileV3(user1.token, user2.authUserId).user,
        reqUserProfileV3(user1.token, user3.authUserId).user,
      ]
    });
  });
});

describe('/dm/leave/v2', () => {
  let user1: AuthUserObject;
  let user2: AuthUserObject;
  let user3: AuthUserObject;

  let dmId1: DmCreateObject;
  let dmId2: DmCreateObject;
  let dmId3: DmCreateObject;

  beforeEach(() => {
    user1 = reqAuthRegisterV3('A@gmail.com', 'password', 'A', 'Surname');
    user2 = reqAuthRegisterV3('B@gmail.com', 'password', 'B', 'Surname');
    user3 = reqAuthRegisterV3('C@gmail.com', 'password', 'C', 'Surname');

    dmId1 = reqDmCreateV2(user1.token, [user2.authUserId, user3.authUserId] as number[]);
    dmId2 = reqDmCreateV2(user3.token, [user2.authUserId, user1.authUserId] as number[]);
    dmId3 = reqDmCreateV2(user1.token, [user2.authUserId] as number[]);
  });

  test('Invalid Paramaters', () => {
    expect(reqDmLeaveV2('token', dmId1.dmId)).toStrictEqual(FORBIDDEN);
    expect(reqDmLeaveV2(user1.token, -1)).toStrictEqual(BAD_REQUEST);
    expect(reqDmLeaveV2(user1.token, 900)).toStrictEqual(BAD_REQUEST);
  });

  test('non Owner Leaving', () => {
    expect(reqDmLeaveV2(user2.token, dmId1.dmId)).toStrictEqual({});
    expect(reqDmDetailsV2(user1.token, dmId1.dmId)).toStrictEqual(
      {
        name: 'asurname, bsurname, csurname',
        members: [
          {
            uId: user1.authUserId,
            email: 'A@gmail.com',
            nameFirst: 'A',
            nameLast: 'Surname',
            handleStr: 'asurname',
            profileImgUrl: expect.any(String)
          },
          {
            uId: user3.authUserId,
            email: 'C@gmail.com',
            nameFirst: 'C',
            nameLast: 'Surname',
            handleStr: 'csurname',
            profileImgUrl: expect.any(String)
          }]
      }
    );
    expect(reqDmLeaveV2(user3.token, dmId1.dmId)).toStrictEqual({});
    expect(reqDmDetailsV2(user1.token, dmId1.dmId)).toStrictEqual(
      {
        name: 'asurname, bsurname, csurname',
        members: [{
          uId: user1.authUserId,
          email: 'A@gmail.com',
          nameFirst: 'A',
          nameLast: 'Surname',
          handleStr: 'asurname',
          profileImgUrl: expect.any(String)
        }]
      }
    );
  });

  test('trying to leave when not part of the dm', () => {
    expect(reqDmLeaveV2(user3.token, dmId3.dmId)).toStrictEqual(FORBIDDEN);
  });

  test('Owner Leaving', () => {
    expect(reqDmLeaveV2(user3.token, dmId2.dmId)).toStrictEqual({});
    expect(reqDmDetailsV2(user1.token, dmId2.dmId)).toStrictEqual(
      {
        name: 'asurname, bsurname, csurname',
        members: [
          {
            uId: user2.authUserId,
            email: 'B@gmail.com',
            nameFirst: 'B',
            nameLast: 'Surname',
            handleStr: 'bsurname',
            profileImgUrl: expect.any(String)
          },
          {
            uId: user1.authUserId,
            email: 'A@gmail.com',
            nameFirst: 'A',
            nameLast: 'Surname',
            handleStr: 'asurname',
            profileImgUrl: expect.any(String)
          }]
      }
    );
    expect(reqDmLeaveV2(user1.token, dmId2.dmId)).toStrictEqual({});
    expect(reqDmDetailsV2(user2.token, dmId2.dmId)).toStrictEqual(
      {
        name: 'asurname, bsurname, csurname',
        members: [{
          uId: user2.authUserId,
          email: 'B@gmail.com',
          nameFirst: 'B',
          nameLast: 'Surname',
          handleStr: 'bsurname',
          profileImgUrl: expect.any(String)
        }]
      }
    );
  });
});

describe('/dm/messages/v2', () => {
  describe('Invalid arguments', () => {
    let user1: USERID;
    let userId1: USERID;
    let user2: USERID;
    let userId2: USERID;
    let dm1: DmCreateObject;
    let dmId1: number;
    beforeEach(() => {
      user1 = reqAuthRegisterV3('example@gmail.com', 'cats1234', 'Jack', 'Rabbit');
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

    test('Invalid dm', () => {
      expect(reqDmMessagesV2(userId1.token, dmId1 + 1, 0)).toStrictEqual(BAD_REQUEST);
    });

    test('Invalid authUserId token', () => {
      expect(reqDmMessagesV2('random', dmId1, 0)).toStrictEqual(FORBIDDEN);
    });

    test('start index greater than total channel messages', () => {
      expect(reqDmMessagesV2(userId1.token, dmId1, 50)).toStrictEqual(BAD_REQUEST);
      expect(reqDmMessagesV2(userId1.token, dmId1, 20)).toStrictEqual(BAD_REQUEST);
      expect(reqDmMessagesV2(userId1.token, dmId1, 1)).toStrictEqual(BAD_REQUEST);
    });

    test('auth member not part of channel', () => {
      const user3 = reqAuthRegisterV3('sample@gmail.com', 'securepassword', 'Seb', 'Ryan');
      let userId3: USERID;
      if ('authUserId' in user3) {
        userId3 = user3;
      }
      expect(reqDmMessagesV2(userId3.token, dmId1, 0)).toStrictEqual(FORBIDDEN);
    });
  });

  describe('Valid cases', () => {
    let owner: USERID;
    let ownerId: USERID;
    let member1: USERID;
    let memberId1: USERID;
    let dm: DmCreateObject;
    let dmId: number;
    beforeEach(() => {
      owner = reqAuthRegisterV3('simple2@gmail.com', 'username', 'Ben', 'bryant');
      member1 = reqAuthRegisterV3('sample@gmail.com', 'securepassword', 'Seb', 'Ryan');
      if ('authUserId' in owner && 'authUserId' in member1) {
        ownerId = owner;
        memberId1 = member1;
      }
      dm = reqDmCreateV2(ownerId.token, [memberId1.authUserId]);
      if ('dmId' in dm) {
        dmId = dm.dmId;
      }
    });

    test('empty case with channel owner', () => {
      expect(reqDmMessagesV2(ownerId.token, dmId, 0)).toStrictEqual({
        messages: [],
        start: 0,
        end: -1,
      });
    });

    test('empty case with non-owner member', () => {
      expect(reqDmMessagesV2(memberId1.token, dmId, 0)).toStrictEqual({
        messages: [],
        start: 0,
        end: -1,
      });
    });

    test('empty case negative start indexes', () => {
      for (let i = -1; i > -7; i--) {
        expect(reqDmMessagesV2(ownerId.token, dmId, i)).toStrictEqual({
          messages: [],
          start: i,
          end: -1,
        });
      }
    });

    test('testing end index', () => {
      for (let i = 0; i < 100; i++) {
        reqMessageSendDmV2(ownerId.token, dmId, 'hello');
      }
      let request = reqDmMessagesV2(ownerId.token, dmId, 3);
      expect(request.end).toEqual(53);
      request = reqDmMessagesV2(ownerId.token, dmId, 40);
      expect(request.end).toEqual(90);
      request = reqDmMessagesV2(ownerId.token, dmId, 80);
      expect(request.end).toEqual(-1);
    });
  });
});
