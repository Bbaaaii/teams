import { getImage, getUserFromToken, setProfileImg, validateCropSize } from './helper';
import HTTPError from 'http-errors';
import { INTERNAL_ERROR } from './requestHelpers';
import { FORBIDDEN, BAD_REQUEST, NOT_FOUND } from './httpsConsts';

const sizeOf = require('image-size');
const sharp = require('sharp');

export function uploadPhotoV1(token: string, imgUrl: string, xStart: number, yStart: number, xEnd: number, yEnd: number) {
  const user = getUserFromToken(token);

  if (user === null) {
    throw HTTPError(FORBIDDEN, `Token ${token} is invalid!`);
  }

  if (!imgUrl.endsWith('jpg') && !imgUrl.endsWith('jpeg')) {
    throw HTTPError(BAD_REQUEST, 'Image must be a jpg or jpeg');
  }
  xStart -= 1;
  yStart -= 1;
  xEnd -= 1;
  yEnd -= 1;

  if (!validateCropSize(xStart, yStart, xEnd, yEnd)) {
    throw HTTPError(BAD_REQUEST, `Invalid crop size: (${xStart}, ${yStart}, ${xEnd}, ${yEnd})`);
  }

  const img = getImage(imgUrl);

  if (img === FORBIDDEN || img === BAD_REQUEST || img === NOT_FOUND) {
    throw HTTPError(BAD_REQUEST, `Image ${imgUrl} is not a valid url`);
  }

  // check image dimensions
  const dimensions = sizeOf(img);

  if (xStart >= dimensions.width || yStart >= dimensions.height || xEnd >= dimensions.width || yEnd >= dimensions.height) {
    throw HTTPError(BAD_REQUEST, `Invalid crop size (not in image dimensions): (${xStart}, ${yStart}, ${xEnd}, ${yEnd})`);
  }

  const savePath = `img/${user.uId}.jpg`;

  // crop the image
  sharp(img).extract({ left: xStart, top: yStart, width: xEnd - xStart + 1, height: yEnd - yStart + 1 }).toFile(savePath).catch((err: Error) => {
    throw HTTPError(INTERNAL_ERROR, `Error cropping image: ${err}`);
  });

  // update the user's profile image url

  setProfileImg(user.uId);

  return {};
}
