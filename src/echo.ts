import HTTPError from 'http-errors';
import { BAD_REQUEST } from './httpsConsts';

function echo(value: string) {
  if (value === 'echo') {
    // NEW Iteration 3
    throw HTTPError(BAD_REQUEST, 'Cannot echo "echo"');
    // OLD Iteration 2
    // return { error: 'error' };
  }
  return value;
}

export { echo };
