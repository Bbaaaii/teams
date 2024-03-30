import express, { json, Request, Response } from 'express';
import { echo } from './echo';
import morgan from 'morgan';
import config from './config.json';
import cors from 'cors';
import errorHandler from 'middleware-http-errors';
import { saveData, loadData } from './dataStore';

import {
  authLoginV3,
  authRegisterV3,
  authLogoutV2,
  authPasswordResetRequestV1,
  authPasswordResetV1
} from './auth';

import {
  channelsCreateV3,
  channelsListV3,
  channelsListAllV3
} from './channels';

import {
  channelDetailsV3,
  channelJoinV3,
  channelInviteV3,
  channelMessagesV3,
  channelLeaveV2,
  addOwnerV2,
  removeOwnerV2
} from './channel';

import {
  messageSendV2,
  messageEditV2,
  messageRemoveV2,
  sendDmV2,
  messageShareV1,
  messagePinV1,
  messageUnpinV1,
  messageSendLaterV1,
  messageSendLaterDmV1,
  messageReactV1,
  messageUnreactV1,
  searchV1
} from './message';

import {
  standupStartV1,
  standupActiveV1,
  standupSendV1
} from './standup';

import {
  dmCreateV2,
  dmListV2,
  dmRemoveV2,
  dmDetailsV2,
  dmLeaveV2,
  dmMessagesV2
} from './dm';

import {
  usersAllV2,
  userProfileV3,
  userProfileSetNameV2,
  userProfileSetEmailV2,
  userProfileSetHandleV2,
  userStatsV1,
  workspaceStatsV1
} from './users';

import {
  clearV1,
  getNotificationsV1
} from './other';
import { uploadPhotoV1 } from './profileImage';
import { changeUserPermission, removeUser } from './admin';

// Load dataStore from dataStore.json
loadData();
// Set up web app
const app = express();
// Use middleware that allows us to access the JSON body of requests
app.use(json());
// Use middleware that allows for access from other domains
app.use(cors());
// for logging errors (print to terminal)
app.use(morgan('dev'));
// middleware for persistance
app.use((req: Request, res: Response, next) => {
  res.on('finish', () => {
    saveData();
  });
  next();
});
// serve static files at /img
app.use('/img', express.static('img'));

const PORT: number = parseInt(process.env.PORT || config.port);
const HOST: string = process.env.IP || 'localhost';

// Example get request
app.get('/echo', (req: Request, res: Response, next) => {
  const data = req.query.echo as string;
  return res.json(echo(data));
});

app.post('/auth/login/v3', (req: Request, res: Response) => {
  return res.json(authLoginV3(
    req.body.email as string,
    req.body.password as string
  ));
});

app.post('/auth/register/v3', (req: Request, res: Response) => {
  return res.json(authRegisterV3(
    req.body.email as string,
    req.body.password as string,
    req.body.nameFirst as string,
    req.body.nameLast as string
  ));
});

app.post('/auth/logout/v2', (req: Request, res: Response) => {
  console.log(req.headers.token as string);
  return res.json(authLogoutV2(
    req.headers.token as string
  ));
});

app.post('/auth/passwordreset/request/v1', (req: Request, res: Response) => {
  console.log(req.body.email as string);
  return res.json(authPasswordResetRequestV1(
    req.body.email as string
  ));
});

app.post('/auth/passwordreset/reset/v1', (req: Request, res: Response) => {
  console.log(req.body.email as string);
  return res.json(authPasswordResetV1(
    req.body.resetCode as string,
    req.body.newPassword as string
  ));
});

app.post('/channels/create/v3', (req: Request, res: Response) => {
  return res.json(channelsCreateV3(
    req.headers.token as string,
    req.body.name as string,
    req.body.isPublic as boolean
  ));
});

app.get('/channels/list/v3', (req: Request, res: Response) => {
  return res.json(channelsListV3(
    req.headers.token as string
  ));
});

app.get('/channels/listAll/v3', (req: Request, res: Response) => {
  return res.json(channelsListAllV3(
    req.headers.token as string
  ));
});

app.get('/channel/details/v3', (req: Request, res: Response) => {
  return res.json(channelDetailsV3(
    req.headers.token as string,
    parseInt(req.query.channelId as string)
  ));
});

app.post('/channel/join/v3', (req: Request, res: Response) => {
  return res.json(channelJoinV3(
    req.headers.token as string,
    parseInt(req.body.channelId as string)
  ));
});

app.post('/channel/invite/v3', (req: Request, res: Response) => {
  return res.json(channelInviteV3(
    req.headers.token as string,
    parseInt(req.body.channelId as string),
    parseInt(req.body.uId as string)
  ));
});

app.get('/channel/messages/v3', (req: Request, res: Response) => {
  return res.json(channelMessagesV3(
    req.headers.token as string,
    parseInt(req.query.channelId as string),
    parseInt(req.query.start as string)
  ));
});

app.post('/channel/leave/v2', (req: Request, res: Response) => {
  return res.json(channelLeaveV2(
    req.headers.token as string,
    parseInt(req.body.channelId as string)
  ));
});

app.post('/channel/addowner/v2', (req: Request, res: Response) => {
  return res.json(addOwnerV2(
    req.headers.token as string,
    parseInt(req.body.channelId as string),
    parseInt(req.body.uId as string)
  ));
});

app.post('/channel/removeowner/v2', (req: Request, res: Response) => {
  return res.json(removeOwnerV2(
    req.headers.token as string,
    parseInt(req.body.channelId as string),
    parseInt(req.body.uId as string)
  ));
});

app.post('/message/send/v2', (req: Request, res: Response) => {
  return res.json(messageSendV2(
    req.headers.token as string,
    parseInt(req.body.channelId as string),
    req.body.message as string
  ));
});

app.put('/message/edit/v2', (req: Request, res: Response) => {
  return res.json(messageEditV2(
    req.headers.token as string,
    parseInt(req.body.messageId as string),
    req.body.message as string
  ));
});

app.delete('/message/remove/v2', (req: Request, res: Response) => {
  return res.json(messageRemoveV2(
    req.headers.token as string,
    parseInt(req.query.messageId as string)
  ));
});

app.post('/message/pin/v1', (req: Request, res: Response) => {
  return res.json(messagePinV1(
    req.headers.token as string,
    parseInt(req.body.messageId as string)
  ));
});

app.post('/message/unpin/v1', (req: Request, res: Response) => {
  return res.json(messageUnpinV1(
    req.headers.token as string,
    parseInt(req.body.messageId as string)
  ));
});

app.post('/message/react/v1', (req: Request, res: Response) => {
  return res.json(messageReactV1(
    req.headers.token as string,
    parseInt(req.body.messageId as string),
    parseInt(req.body.reactId as string)
  ));
});

app.post('/message/unreact/v1', (req: Request, res: Response) => {
  return res.json(messageUnreactV1(
    req.headers.token as string,
    parseInt(req.body.messageId as string),
    parseInt(req.body.reactId as string)
  ));
});

app.post('/standup/start/v1', (req: Request, res: Response) => {
  return res.json(standupStartV1(
    req.headers.token as string,
    parseInt(req.body.channelId as string),
    parseInt(req.body.length as string)
  ));
});

app.get('/standup/active/v1', (req: Request, res: Response) => {
  return res.json(standupActiveV1(
    req.headers.token as string,
    parseInt(req.query.channelId as string)
  ));
});

app.post('/standup/send/v1', (req: Request, res: Response) => {
  return res.json(standupSendV1(
    req.headers.token as string,
    parseInt(req.body.channelId as string),
    req.body.message as string
  ));
});

app.post('/dm/create/v2', (req: Request, res: Response) => {
  return res.json(dmCreateV2(
    req.headers.token as string,
    req.body.uIds as number[]
  ));
});

app.get('/dm/list/v2', (req: Request, res: Response) => {
  return res.json(dmListV2(
    req.headers.token as string
  ));
});

app.delete('/dm/remove/v2', (req: Request, res: Response) => {
  return res.json(dmRemoveV2(
    req.headers.token as string,
    parseInt(req.query.dmId as string)
  ));
});

app.get('/dm/details/v2', (req: Request, res: Response) => {
  return res.json(dmDetailsV2(
    req.headers.token as string,
    parseInt(req.query.dmId as string)
  ));
});

app.post('/dm/leave/v2', (req: Request, res: Response) => {
  return res.json(dmLeaveV2(
    req.headers.token as string,
    parseInt(req.body.dmId as string)
  ));
});

app.get('/dm/messages/v2', (req: Request, res: Response) => {
  return res.json(dmMessagesV2(
    req.headers.token as string,
    parseInt(req.query.dmId as string),
    parseInt(req.query.start as string)
  ));
});

app.post('/message/senddm/v2', (req: Request, res: Response) => {
  return res.json(sendDmV2(
    req.headers.token as string,
    parseInt(req.body.dmId as string),
    req.body.message as string
  ));
});

app.get('/users/all/v2', (req: Request, res: Response) => {
  return res.json(usersAllV2(
    req.headers.token as string
  ));
});

app.get('/user/profile/v3', (req: Request, res: Response) => {
  return res.json(userProfileV3(
    req.headers.token as string,
    parseInt(req.query.uId as string)
  ));
});

app.put('/user/profile/setname/v2', (req: Request, res: Response) => {
  return res.json(userProfileSetNameV2(
    req.headers.token as string,
    req.body.nameFirst as string,
    req.body.nameLast as string
  ));
});

app.put('/user/profile/setemail/v2', (req: Request, res: Response) => {
  return res.json(userProfileSetEmailV2(
    req.headers.token as string,
    req.body.email as string
  ));
});

app.put('/user/profile/sethandle/v2', (req: Request, res: Response) => {
  return res.json(userProfileSetHandleV2(
    req.headers.token as string,
    req.body.handleStr as string
  ));
});

app.post('/message/share/v1', (req: Request, res: Response) => {
  return res.json(messageShareV1(
    req.headers.token as string,
    parseInt(req.body.ogMessageId as string),
    req.body.message as string,
    parseInt(req.body.channelId as string),
    parseInt(req.body.dmId as string)
  ));
});

app.get('/search/v1', (req: Request, res: Response) => {
  return res.json(searchV1(
    req.headers.token as string,
    req.query.queryStr as string
  ));
});

app.post('/message/sendlater/v1', (req: Request, res: Response) => {
  return res.json(messageSendLaterV1(
    req.headers.token as string,
    parseInt(req.body.channelId as string),
    req.body.message as string,
    parseInt(req.body.timeSent as string)
  ));
});

app.post('/message/sendlaterdm/v1', (req: Request, res: Response) => {
  return res.json(messageSendLaterDmV1(
    req.headers.token as string,
    parseInt(req.body.dmId as string),
    req.body.message as string,
    parseInt(req.body.timeSent as string)
  ));
});

app.get('/notifications/get/v1', (req: Request, res: Response) => {
  return res.json(getNotificationsV1(
    req.headers.token as string
  ));
});

app.get('/user/stats/v1', (req: Request, res: Response) => {
  return res.json(userStatsV1(
    req.headers.token as string
  ));
});

app.get('/users/stats/v1', (req: Request, res: Response) => {
  return res.json(workspaceStatsV1(
    req.headers.token as string
  ));
});

app.delete('/clear/v1', (req: Request, res: Response) => {
  return res.json(clearV1());
});

app.post('/user/profile/uploadphoto/v1', (req: Request, res: Response) => {
  return res.json(
    uploadPhotoV1(
      req.headers.token as string,
      req.body.imgUrl as string,
      parseInt(req.body.xStart as string),
      parseInt(req.body.yStart as string),
      parseInt(req.body.xEnd as string),
      parseInt(req.body.yEnd as string))
  );
});

app.post('/admin/userpermission/change/v1', (req: Request, res: Response) => {
  return res.json(changeUserPermission(
    req.headers.token as string,
    parseInt(req.body.uId as string),
    parseInt(req.body.permissionId as string)
  ));
});

app.delete('/admin/user/remove/v1', (req: Request, res: Response) => {
  return res.json(removeUser(
    req.headers.token as string,
    parseInt(req.query.uId as string)
  ));
});

// Keep this BENEATH route definitions
// handles errors nicely
app.use(errorHandler());

// start server
const server = app.listen(PORT, HOST, () => {
  // DO NOT CHANGE THIS LINE
  console.log(`⚡️ Server started on port ${PORT} at ${HOST} (http://${HOST}:${PORT})`);
});

// For coverage, handle Ctrl+C gracefully
process.on('SIGINT', () => {
  server.close(() => console.log('Shutting down server gracefully.'));
});
