import { getData } from './dataStore';
import {
  getUserFromEmail,
  getUserNextId,
  generateUniqueHandle,
  getUserFromToken
} from './helper';

import validator from 'validator';
import { v4 as uuidv4 } from 'uuid';
import { hashCompare, hashString } from './hash';
import HTTPError from 'http-errors';
import nodemailer from 'nodemailer';
import { BAD_REQUEST, FORBIDDEN } from './httpsConsts';
import { AuthUserObject } from './types/auth';
import { Empty } from './types/other';
import { User } from './types/users';

const MIN_PASSWORD_LENGTH = 6;
const MIN_NAME_LENGTH = 0;
const MAX_NAME_LENGTH = 50;

/**
 * Given a registered user's email and password, returns their authUserId value and a unique session token.
 * @param {string} email Email of user
 * @param {string} password Password of user
 * @returns {AuthUserObject}
 */
export function authLoginV3(email: string, password: string): AuthUserObject {
  const userObject = getUserFromEmail(email);

  if (userObject === undefined) {
    throw HTTPError(BAD_REQUEST, `Email (${email}) doesn't exist!`);
  }

  if (!hashCompare(password, userObject.password)) {
    throw HTTPError(BAD_REQUEST, `Password (${password}) is incorrect!`);
  }

  const token = uuidv4();
  userObject.tokens.push(hashString(token));

  return {
    authUserId: userObject.uId,
    token: token,
  };
}

/**
 *
 * @param {string} email Email to use for new account
 * @param {string} password
 * @param {string} nameFirst
 * @param {string} nameLast
 * @returns {TokenObject}
 * Assumption: User ids start from 0
 */
export function authRegisterV3(email: string, password: string, nameFirst: string, nameLast: string): AuthUserObject {
  if (!validator.isEmail(email)) {
    throw HTTPError(BAD_REQUEST, `Invalid email (${email})`);
  }

  if (
    nameFirst.length <= MIN_NAME_LENGTH ||
    nameFirst.length > MAX_NAME_LENGTH
  ) {
    throw HTTPError(BAD_REQUEST, `Invalid length for first name (${nameFirst})`);
  }

  if (nameLast.length <= MIN_NAME_LENGTH || nameLast.length > MAX_NAME_LENGTH) {
    throw HTTPError(BAD_REQUEST, `Invalid length for last name (${nameLast})`);
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    throw HTTPError(BAD_REQUEST, `Invalid length for password (${password})`);
  }

  const dataStore = getData();

  if (
    dataStore.users.find((userObject) => {
      return userObject.email === email;
    }) !== undefined
  ) {
    throw HTTPError(BAD_REQUEST, `${email} already exists!`);
  }

  const userId = getUserNextId();
  const token = uuidv4();

  const MS = 1000;
  const timeNow = Math.floor((new Date()).getTime() / MS);

  const userObject: User = {
    uId: userId,
    email: email,
    password: hashString(password),
    nameFirst: nameFirst,
    nameLast: nameLast,
    handleStr: generateUniqueHandle(nameFirst, nameLast),
    tokens: [hashString(token)],
    notifications: [],
    resetCodes: [],
    userStats: {
      channelsJoined: [{ numChannelsJoined: 0, timeStamp: timeNow }],
      dmsJoined: [{ numDmsJoined: 0, timeStamp: timeNow }],
      messagesSent: [{ numMessagesSent: 0, timeStamp: timeNow }]
    }
  };

  dataStore.users.push(userObject);

  if (userId === 0) {
    dataStore.workspaceStats = {
      channelsExist: [{ numChannelsExist: 0, timeStamp: Math.floor((new Date()).getTime() / MS) }],
      dmsExist: [{ numDmsExist: 0, timeStamp: Math.floor((new Date()).getTime() / MS) }],
      messagesExist: [{ numMessagesExist: 0, timeStamp: Math.floor((new Date()).getTime() / MS) }]
    };
  }

  // FIX THE THING

  if (dataStore.globalOwners.length === 0) {
    dataStore.globalOwners.push(userId);
  }

  return {
    authUserId: userId,
    token: token
  };
}

/**
 * @param {string} token
 * @returns { }
 */
export function authLogoutV2(token: string): Empty {
  const user = getUserFromToken(token);
  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token (${token}) is invalid`);
  }
  user.tokens.splice(user.tokens.indexOf(hashString(token)), 1);
  return {};
}

/**
 * given an email, if user with matching email exists, sends reset code to email
 * adds resetCode to data and logs user out of active sessions
 * @param {string} email
 * @returns { }
 */
export function authPasswordResetRequestV1(email: string): Empty {
  const user = getUserFromEmail(email);

  if (user !== undefined) {
    const resetCode = String(Math.floor((Math.random() * 999) + 99));
    const emailText = 'Your password reset code is: ' + resetCode;
    const transporter = nodemailer.createTransport({
      host: 'smtp.fastmail.com',
      port: 465,
      auth: {
        user: 'unswmemes@fastmail.com',
        pass: 'ng823wytgghs885k'
      }
    });
    transporter.sendMail({
      from: '"UNSW Memes" <unswmemes@fastmail.com>',
      to: email,
      subject: 'UNSW Memes password reset code',
      text: emailText
    });
    user.resetCodes.push(hashString(resetCode));
    user.tokens = [];
  }

  return {};
}

/**
 * given resetCode and newPassword, finds user with matching resetCode and updates password to newPassword
 * throws error if password is too short or if no user has resetCode
 * @param {string} resetCode
 * @param {string} newPassword
 * @returns { }
 */
export function authPasswordResetV1(resetCode: string, newPassword: string): Empty {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw HTTPError(BAD_REQUEST, `Invalid length for password (${newPassword})`);
  }
  const dataStore = getData();
  for (const user of dataStore.users) {
    for (const code of user.resetCodes) {
      if (hashCompare(resetCode, code)) {
        user.password = hashString(newPassword);
        user.resetCodes.splice(user.resetCodes.indexOf(code), 1);
        return {};
      }
    }
  }
  throw HTTPError(BAD_REQUEST, `(${resetCode}) is not a valid reset code`);
}
