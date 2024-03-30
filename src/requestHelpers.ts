import request, { HttpVerb } from 'sync-request';

import { port, url } from './config.json';
import { OK } from './httpsConsts';

const SERVER_URL = `${url}:${port}`;

export const INTERNAL_ERROR = 500;
export const TIMEOUT_TIME = 10000;

export function requestHelper(method: HttpVerb, path: string, payload: object, token = ''): any | number {
  let qs = {};
  let json = {};
  if (['GET', 'DELETE'].includes(method)) {
    qs = payload;
  } else {
    // PUT/POST
    json = payload;
  }

  const res = request(method, SERVER_URL + path, { qs: qs, json: json, headers: { token: token }, timeout: TIMEOUT_TIME });

  if (res.statusCode !== OK) {
    return res.statusCode;
  }

  return JSON.parse(res.getBody() as string);
}

export function reqAuthLoginV3(email: string, password: string) {
  return requestHelper('POST', '/auth/login/v3', { email: email, password: password });
}

export function reqAuthRegisterV3(email: string, password: string, nameFirst: string, nameLast: string) {
  return requestHelper('POST', '/auth/register/v3', { email: email, password: password, nameFirst: nameFirst, nameLast: nameLast });
}

export function reqAuthLogoutV2(token: string) {
  return requestHelper('POST', '/auth/logout/v2', {}, token);
}

export function reqAuthPasswordResetRequestV1(email: string) {
  return requestHelper('POST', '/auth/passwordreset/request/v1', { email: email });
}

export function reqAuthPasswordResetV1(resetCode: string, newPassword: string) {
  return requestHelper('POST', '/auth/passwordreset/reset/v1', { resetCode: resetCode, newPassword: newPassword });
}

export function reqChannelsCreateV3(token: string, name: string, isPublic: boolean) {
  return requestHelper('POST', '/channels/create/v3', { name, isPublic }, token);
}

export function reqChannelsListV3(token: string) {
  return requestHelper('GET', '/channels/list/v3', {}, token);
}

export function reqChannelsListAllV3(token: string) {
  return requestHelper('GET', '/channels/listAll/v3', {}, token);
}

export function reqChannelDetailsV3(token: string, channelId: number) {
  return requestHelper('GET', '/channel/details/v3', { channelId }, token);
}

export function reqChannelJoinV3(token: string, channelId: number) {
  return requestHelper('POST', '/channel/join/v3', { channelId }, token);
}

export function reqChannelInviteV3(token: string, channelId: number, uId: number) {
  return requestHelper('POST', '/channel/invite/v3', { channelId, uId }, token);
}

export function reqChannelMessagesV3(token: string, channelId: number, start: number) {
  return requestHelper('GET', '/channel/messages/v3', { channelId, start }, token);
}

export function reqChannelLeaveV2(token: string, channelId: number) {
  return requestHelper('POST', '/channel/leave/v2', { channelId }, token);
}

export function reqChannelAddOwnerV2(token: string, channelId: number, uId: number) {
  return requestHelper('POST', '/channel/addowner/v2', { channelId, uId }, token);
}

export function reqChannelRemoveOwnerV2(token: string, channelId: number, uId: number) {
  return requestHelper('POST', '/channel/removeowner/v2', { channelId, uId }, token);
}

export function reqMessageSendV2(token: string, channelId: number, message: string) {
  return requestHelper('POST', '/message/send/v2', { channelId, message }, token);
}

export function reqMessageEditV2(token: string, messageId: number, message: string) {
  return requestHelper('PUT', '/message/edit/v2', { messageId, message }, token);
}

export function reqMessageRemoveV2(token: string, messageId: number) {
  return requestHelper('DELETE', '/message/remove/v2', { messageId }, token);
}

export function reqMessageReactV1(token: string, messageId: number, reactId: number) {
  return requestHelper('POST', '/message/react/v1', { messageId, reactId }, token);
}

export function reqMessageUnreactV1(token: string, messageId: number, reactId: number) {
  return requestHelper('POST', '/message/unreact/v1', { messageId, reactId }, token);
}

export function reqStandupStartV1(token: string, channelId: number, length: number) {
  return requestHelper('POST', '/standup/start/v1', { channelId, length }, token);
}

export function reqStandupActiveV1(token: string, channelId: number) {
  return requestHelper('GET', '/standup/active/v1', { channelId }, token);
}

export function reqStandupSendV1(token: string, channelId: number, message: string) {
  return requestHelper('POST', '/standup/send/v1', { channelId, message }, token);
}

export function reqDmCreateV2(token: string, uIds: number[]) {
  return requestHelper('POST', '/dm/create/v2', { uIds }, token);
}

export function reqDmListV2(token: string) {
  return requestHelper('GET', '/dm/list/v2', {}, token);
}

export function reqDmRemoveV2(token: string, dmId: number) {
  return requestHelper('DELETE', '/dm/remove/v2', { dmId }, token);
}

export function reqDmDetailsV2(token: string, dmId: number) {
  return requestHelper('GET', '/dm/details/v2', { dmId }, token);
}

export function reqDmLeaveV2(token: string, dmId: number) {
  return requestHelper('POST', '/dm/leave/v2', { dmId }, token);
}

export function reqDmMessagesV2(token: string, dmId: number, start: number) {
  return requestHelper('GET', '/dm/messages/v2', { dmId, start }, token);
}

export function reqMessageSendDmV2(token: string, dmId: number, message: string) {
  return requestHelper('POST', '/message/senddm/v2', { dmId, message }, token);
}

export function reqUsersAllV2(token: string) {
  return requestHelper('GET', '/users/all/v2', {}, token);
}

export function reqUserProfileV3(token: string, uId: number) {
  return requestHelper('GET', '/user/profile/v3', { uId }, token);
}

export function reqUserProfileSetNameV2(token: string, nameFirst: string, nameLast: string) {
  return requestHelper('PUT', '/user/profile/setname/v2', { nameFirst, nameLast }, token);
}

export function reqUserProfileSetEmailV2(token: string, email: string) {
  return requestHelper('PUT', '/user/profile/setemail/v2', { email }, token);
}

export function reqUserProfileSetHandleV2(token: string, handleStr: string) {
  return requestHelper('PUT', '/user/profile/sethandle/v2', { handleStr }, token);
}

export function reqMessageShareV1(token: string, ogMessageId: number, message: string, channelId: number, dmId: number) {
  return requestHelper('POST', '/message/share/v1', { ogMessageId, message, channelId, dmId }, token);
}

export function reqMessagePinV1(token: string, messageId: number) {
  return requestHelper('POST', '/message/pin/v1', { messageId }, token);
}

export function reqMessageUnpinV1(token: string, messageId: number) {
  return requestHelper('POST', '/message/unpin/v1', { messageId }, token);
}

export function reqMessageSendLaterV1(token: string, channelId: number, message: string, timeSent: number) {
  return requestHelper('POST', '/message/sendlater/v1', { channelId, message, timeSent }, token);
}

export function reqMessageSendLaterDmV1(token: string, dmId: number, message: string, timeSent: number) {
  return requestHelper('POST', '/message/sendlaterdm/v1', { dmId, message, timeSent }, token);
}

export function reqSearchV1(token: string, queryStr: string) {
  return requestHelper('GET', '/search/v1', { queryStr }, token);
}

export function reqUserStatsV1(token: string) {
  return requestHelper('GET', '/user/stats/v1', {}, token);
}

export function reqWorkplaceStatsV1(token: string) {
  return requestHelper('GET', '/users/stats/v1', {}, token);
}

export function reqNotificationsGetV1(token: string) {
  return requestHelper('GET', '/notifications/get/v1', {}, token);
}

export function reqClearV1() {
  return requestHelper('DELETE', '/clear/v1', {});
}

export function reqUploadPhotoV1(token: string, url: string, startX: number, startY: number, endX: number, endY: number) {
  return requestHelper('POST', '/user/profile/uploadphoto/v1', { imgUrl: url, xStart: startX, yStart: startY, xEnd: endX, yEnd: endY }, token);
}

export function reqAdminUserPermissionChangeV1(token: string, uId: number, permissionId: number) {
  return requestHelper('POST', '/admin/userpermission/change/v1', { uId, permissionId }, token);
}

export function reqAdminUserRemoveV1(token: string, uId: number) {
  return requestHelper('DELETE', '/admin/user/remove/v1', { uId }, token);
}
