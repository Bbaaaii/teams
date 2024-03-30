import {
  reqAuthRegisterV3,
  reqChannelsCreateV3,
  reqChannelInviteV3,
  reqChannelMessagesV3,
  reqStandupStartV1,
  reqStandupActiveV1,
  reqStandupSendV1,
  reqClearV1,
} from '../src/requestHelpers';

import { BAD_REQUEST, FORBIDDEN } from '../src/httpsConsts';

type CHANNELID = { channelId: number }
type USERID = { authUserId: number, token: string }

let user1: USERID;
let channel1: CHANNELID;

const ALLOWED_LAG = 10;

const sleepSync = (ms: number) => {
  const end = new Date().getTime() + ms;
  while (new Date().getTime() < end) { /* do nothing */ }
};

beforeEach(() => {
  reqClearV1();
  user1 = reqAuthRegisterV3('tony@starkindustries.com', 'bigtony', 'Tony', 'Stark');
  channel1 = reqChannelsCreateV3(user1.token, 'The Avengers', true);
});

describe('/standup/start/v1', () => {
  test('Invalid Token', () => {
    expect(reqStandupStartV1('Invalid Token', channel1.channelId, 1)).toStrictEqual(FORBIDDEN);
  });

  test('Invalid Channel', () => {
    expect(reqStandupStartV1(user1.token, channel1.channelId + 1, 1)).toStrictEqual(BAD_REQUEST);
  });

  test('Negative Length', () => {
    expect(reqStandupStartV1(user1.token, channel1.channelId, -1)).toStrictEqual(BAD_REQUEST);
  });

  test('Already Running', () => {
    reqStandupStartV1(user1.token, channel1.channelId, 5);
    expect(reqStandupStartV1(user1.token, channel1.channelId, 5)).toStrictEqual(BAD_REQUEST);
  });

  test('User Not In Channel', () => {
    const user2 = reqAuthRegisterV3('sans@undertale.com', 'humerus', 'Sans', 'Undertale');
    expect(reqStandupStartV1(user2.token, channel1.channelId, 1)).toStrictEqual(FORBIDDEN);
  });

  test('Success Case', () => {
    const time = Math.floor((new Date()).getTime() / 1000) + 5;
    const result = reqStandupStartV1(user1.token, channel1.channelId, 5);
    expect(result.timeFinish).toBeGreaterThanOrEqual(time);
    expect(result.timeFinish).toBeLessThan(time + ALLOWED_LAG);
  });
});

describe('/standup/active/v1', () => {
  test('Invalid Token', () => {
    expect(reqStandupActiveV1('Invalid Token', channel1.channelId)).toStrictEqual(FORBIDDEN);
  });

  test('Invalid Channel', () => {
    expect(reqStandupActiveV1(user1.token, channel1.channelId + 1)).toStrictEqual(BAD_REQUEST);
  });

  test('User Not In Channel', () => {
    const user2 = reqAuthRegisterV3('sans@undertale.com', 'humerus', 'Sans', 'Undertale');
    expect(reqStandupActiveV1(user2.token, channel1.channelId)).toStrictEqual(FORBIDDEN);
  });

  test('Success Case', () => {
    const res = reqStandupActiveV1(user1.token, channel1.channelId);
    expect(res).toStrictEqual({
      isActive: false, timeFinish: null
    });
    const timeFinish = reqStandupStartV1(user1.token, channel1.channelId, 5).timeFinish;
    expect(reqStandupActiveV1(user1.token, channel1.channelId)).toStrictEqual({
      isActive: true, timeFinish: timeFinish
    });
  });
});

describe('/standup/send/v1', () => {
  test('Invalid Token', () => {
    reqStandupStartV1(user1.token, channel1.channelId, 5);
    expect(reqStandupSendV1('Invalid Token', channel1.channelId, 'I am Iron Man.')).toStrictEqual(FORBIDDEN);
  });

  test('Invalid Channel', () => {
    reqStandupStartV1(user1.token, channel1.channelId, 5);
    expect(reqStandupSendV1(user1.token, channel1.channelId + 1, 'I am Iron Man.')).toStrictEqual(BAD_REQUEST);
  });

  test('User Not In Channel', () => {
    reqStandupStartV1(user1.token, channel1.channelId, 5);
    const user2 = reqAuthRegisterV3('sans@undertale.com', 'humerus', 'Sans', 'Undertale');
    expect(reqStandupSendV1(user2.token, channel1.channelId, 'snas undertale')).toStrictEqual(FORBIDDEN);
  });

  test('No Active Standup', () => {
    expect(reqStandupSendV1(user1.token, channel1.channelId, 'I am Iron Man.')).toStrictEqual(BAD_REQUEST);
  });

  test('Message Too Long', () => {
    reqStandupStartV1(user1.token, channel1.channelId, 5);
    const message = 'cheeseburger'.repeat(100);
    expect(reqStandupSendV1(user1.token, channel1.channelId, message)).toStrictEqual(BAD_REQUEST);
  });

  test('Success Case', () => {
    // failing because steve doesn't get added to the channel
    const user2 = reqAuthRegisterV3('steve@gmail.com', 'whitePicket', 'Steve', 'Rogers');
    reqChannelInviteV3(user1.token, channel1.channelId, user2.authUserId);
    reqStandupStartV1(user2.token, channel1.channelId, 5);
    reqStandupSendV1(user2.token, channel1.channelId, 'Okay, how are we going to save the day?');
    reqStandupSendV1(user1.token, channel1.channelId, 'idk');
    reqStandupSendV1(user1.token, channel1.channelId, 'im at macdonalds do you want anything');
    reqStandupSendV1(user2.token, channel1.channelId, 'What, no, please, we need to stop Thanos.');

    sleepSync(6000);

    const messages = reqChannelMessagesV3(user1.token, channel1.channelId, 0);
    expect(messages.messages[0].uId).toStrictEqual(user2.authUserId);
    expect(messages.messages[0].message).toStrictEqual(
      'steverogers: Okay, how are we going to save the day?\n' +
      'tonystark: idk\n' +
      'tonystark: im at macdonalds do you want anything\n' +
      'steverogers: What, no, please, we need to stop Thanos.'
    );
  });
});
