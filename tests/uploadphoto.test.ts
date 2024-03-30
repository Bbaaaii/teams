import { reqUploadPhotoV1, reqAuthRegisterV3, reqClearV1, reqUserProfileV3 } from '../src/requestHelpers';
import { getImage } from '../src/helper';

import { BAD_REQUEST, FORBIDDEN, NOT_FOUND } from '../src/httpsConsts';

const sizeOf = require('image-size');

const testImageUrl = 'https://i.imgur.com/Eqbmi4v.jpeg';
const pngImage = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';

const invalidCrops = [
  { startX: -1, startY: 1, endX: 100, endY: 100 },
  { startX: 1, startY: -1, endX: 100, endY: 100 },
  { startX: 1, startY: 1, endX: 0, endY: 100 },
  { startX: 1, startY: 1, endX: 100, endY: 0 },
  { startX: 100, startY: 1, endX: 100, endY: 100 },
  { startX: 1, startY: 100, endX: 100, endY: 100 },
  { startX: 1, startY: 1, endX: 50000, endY: 100 },
  { startX: 1, startY: 1, endX: 100, endY: 50000 },
  { startX: 50000, startY: 1, endX: 500000, endY: 100 },
  { startX: 1, startY: 50000, endX: 100, endY: 500000 }
];

// Outputs named user must contain profile image now

describe('user/profile/uploadphoto/v1', () => {
  describe('Invalid inputs', () => {
    reqClearV1();
    const validUser = reqAuthRegisterV3('yomamma@gmail.com', 'NoBitches?@3', 'Deez', 'Mamma');

    test('Invalid token', () => {
      const res = reqUploadPhotoV1('invalid token', testImageUrl, 0, 0, 100, 100);
      expect(res).toBe(FORBIDDEN);
    });

    test('Invalid image url', () => {
      const res = reqUploadPhotoV1(validUser.token, 'invalid url', 0, 0, 100, 100);
      expect(res).toBe(BAD_REQUEST);
    });

    test('Not JPEG', () => {
      const res = reqUploadPhotoV1(validUser.token, pngImage, 0, 0, 100, 100);
      expect(res).toBe(BAD_REQUEST);
    });

    test.each(invalidCrops)('Invalid crop ($startX, $startY, $endX, $endY)', ({ startX, startY, endX, endY }) => {
      const res = reqUploadPhotoV1(validUser.token, testImageUrl, startX, startY, endX, endY);
      expect(res).toBe(BAD_REQUEST);
    });
  });

  describe('Valid inputs', () => {
    let validUser: { token: string, authUserId: number };

    beforeEach(() => {
      reqClearV1();
      validUser = reqAuthRegisterV3('bingbong@gmail.com', 'NoBitches?@3', 'Deez', 'Mamma');
    });

    test('Generates accessible URL', () => {
      const res = reqUploadPhotoV1(validUser.token, testImageUrl, 1, 1, 175, 200);
      expect(res).toStrictEqual({});
      const userImg = reqUserProfileV3(validUser.token, validUser.authUserId).user.profileImgUrl;
      const requestImage = getImage(userImg);
      expect(requestImage).not.toBe(BAD_REQUEST);
      expect(requestImage).not.toBe(FORBIDDEN);
    });

    test('Generates accessible URL with correct crop size', () => {
      const res = reqUploadPhotoV1(validUser.token, testImageUrl, 1, 1, 100, 100);
      expect(res).toStrictEqual({});
      const profileUrl = reqUserProfileV3(validUser.token, validUser.authUserId).user.profileImgUrl;
      const requestImage = getImage(profileUrl);
      expect(requestImage).not.toBe(BAD_REQUEST);
      expect(requestImage).not.toBe(FORBIDDEN);
      expect(requestImage).not.toBe(NOT_FOUND);
      const dimensions = sizeOf(requestImage);
      expect(dimensions.width).toBe(100);
      expect(dimensions.height).toBe(100);
    });

    test('Default user profile image exists', () => {
      const profileUrl = reqUserProfileV3(validUser.token, validUser.authUserId).user.profileImgUrl;
      const requestImage = getImage(profileUrl);
      expect(requestImage).not.toBe(BAD_REQUEST);
      expect(requestImage).not.toBe(FORBIDDEN);
      expect(requestImage).not.toBe(NOT_FOUND);
    });
  });
});
