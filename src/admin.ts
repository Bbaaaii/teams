import { addGlobalOwner, getUser, getUserFromToken, globalOwnerCount, isGlobalOwner, removeGlobalOwner, userHasPermission } from './helper';
import { BAD_REQUEST, FORBIDDEN } from './httpsConsts';
import { Empty } from './types/other';
import HTTPError from 'http-errors';
import { Permission } from './types/users';
import { getData } from './dataStore';

/**
 * Changes the permission of a user.
 * @returns {Empty}
 */
export function changeUserPermission(token: string, uId: number, permissionId: number): Empty {
  const user = getUserFromToken(token);

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (!isGlobalOwner(user.uId)) {
    throw HTTPError(FORBIDDEN, `User ${user.uId} is not a global owner!`);
  }

  const userToChange = getUser(uId);

  if (userToChange === null) {
    throw HTTPError(BAD_REQUEST, `User ${uId} does not exist!`);
  }

  if (permissionId !== Permission.OWNER && permissionId !== Permission.MEMBER) {
    throw HTTPError(BAD_REQUEST, `Permission ${permissionId} is invalid!`);
  }

  if (isGlobalOwner(userToChange.uId) && permissionId === Permission.MEMBER && globalOwnerCount() === 1) {
    throw HTTPError(BAD_REQUEST, `User ${uId} is the only global owner!`);
  }

  if (userHasPermission(userToChange.uId, permissionId)) {
    throw HTTPError(BAD_REQUEST, `User ${uId} already has permission ${permissionId}!`);
  }

  if (permissionId === Permission.OWNER) {
    addGlobalOwner(uId);
  } else {
    removeGlobalOwner(uId);
  }

  return {};
}

export function removeUser(token: string, uId: number): Empty {
  const user = getUserFromToken(token);

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (!isGlobalOwner(user.uId)) {
    throw HTTPError(FORBIDDEN, `User ${user.uId} is not a global owner!`);
  }

  const userToRemove = getUser(uId);

  if (userToRemove === null) {
    throw HTTPError(BAD_REQUEST, `User ${uId} does not exist!`);
  }

  if (isGlobalOwner(userToRemove.uId) && globalOwnerCount() === 1) {
    throw HTTPError(BAD_REQUEST, `User ${uId} is the only global owner!`);
  }

  const data = getData();

  data.users = data.users.filter((user) => user.uId !== uId);

  data.removedUsers.push({
    uId: uId,
    nameFirst: 'Removed',
    nameLast: 'user',
    email: userToRemove.email,
    handleStr: userToRemove.handleStr,
  });

  return {};
}
