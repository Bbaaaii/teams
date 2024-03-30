import {
  reqAuthLoginV3,
  reqAuthRegisterV3,
  reqAuthLogoutV2,
  reqAuthPasswordResetRequestV1,
  reqAuthPasswordResetV1,
  reqClearV1
} from '../src/requestHelpers';

// NOTE: This doesn't that the token is unique, just that it's a string as token, as a proper way to check for tokens
// hasn't been implemented in the master branch yet

const AuthIdObject = { authUserId: expect.any(Number), token: expect.any(String) };
import { BAD_REQUEST, FORBIDDEN } from '../src/httpsConsts';

// We need to clear the data store before each test to prevent unexpected behaviour related to previous contamination
beforeEach(() => {
  reqClearV1();
});

describe('/auth/login/v3', () => {
  describe('Invalid parameters', () => {
    test('No users', () => {
      expect(reqAuthLoginV3('cats@gmail.com', 'crazyPassword')).toStrictEqual(BAD_REQUEST);
    });

    test('Email does not exist', () => {
      reqAuthRegisterV3('crazyemail@gmail.com', 'amazingpassword123', 'John', 'Smith');
      expect(reqAuthLoginV3('nottherightemail@gmail.com', 'amazingpassword123')).toStrictEqual(BAD_REQUEST);
    });

    test('Password incorrect', () => {
      reqAuthRegisterV3('crazyemail@gmail.com', 'amazingpassword123', 'John', 'Smith');
      expect(reqAuthLoginV3('crazyemail@gmail.com', 'wrongpassword')).toStrictEqual(BAD_REQUEST);
    });
  });

  describe('Valid input', () => {
    test('Correct id (one user)', () => {
      const userId = reqAuthRegisterV3('potato@gmail.com', 'cats123', 'Joe', 'Bob').authUserId;

      const returnId = reqAuthLoginV3('potato@gmail.com', 'cats123').authUserId;

      expect(returnId).toStrictEqual(userId);
    });

    test('Correct id (10 other users)', () => {
      let userId;

      for (let i = 0; i < 10; i++) {
        const tempId = reqAuthRegisterV3(`cats${i}@gmail.com`, 'cats123', 'Cool', 'Cats').authUserId;

        if (i === 5) {
          userId = tempId;
        }
      }

      expect(reqAuthLoginV3('cats5@gmail.com', 'cats123').authUserId).toEqual(userId);
    });
  });
});

/**
 * Assumptions:
 * Passwords can contain special characters, numbers, and capital letters
 * Whatever validator email validates is a valid email, and vice versa
 * First and last names can contain any ASCII character
 * Existing handles are handled by incrementing numbers to the end starting from 0
 */
describe('/auth/register/v3', () => {
  describe('Invalid parameters', () => {
    const invalidEmails = [
      { email: '' },
      { email: 'veryvalidemail@@' },
      { email: 'veryvalidemail@@gmail.com' },
      { email: '@@outhotter.com' },
      { email: '@@outhotter.com' },
      { email: 'awesome.come@' },
      { email: 'pleasevalidateme' },
      { email: 'test&example.com' }, // invalid characters
    ];

    test.each(invalidEmails)('Invalid email ($email)', ({ email }) => {
      expect(reqAuthRegisterV3(email, 'ValidPassword123', 'John', 'Smith')).toStrictEqual(BAD_REQUEST);
    });

    test('Used email', () => {
      reqAuthRegisterV3('marley@gmail.com', 'CatsAreCool123', 'Marley', 'Pog');
      expect(reqAuthRegisterV3('marley@gmail.com', 'Password1234', 'Serpant', 'Man')).toStrictEqual(BAD_REQUEST);
    });

    test('password length < 6', () => {
      expect(reqAuthRegisterV3('marley@gmail.com', 'short', 'Serpant', 'Man')).toStrictEqual(BAD_REQUEST);
    });

    test('Empty password', () => {
      expect(reqAuthRegisterV3('marley@gmail.com', '', 'Serpant', 'Man')).toStrictEqual(BAD_REQUEST);
    });

    test('First name empty', () => {
      expect(reqAuthRegisterV3('marley@gmail.com', 'Password1234', '', 'Man')).toStrictEqual(BAD_REQUEST);
    });

    test('First name length > 50', () => {
      expect(reqAuthRegisterV3('marley@gmail.com', 'Password1234', 'i'.repeat(51), 'Man')).toStrictEqual(BAD_REQUEST);
    });

    test('Last name empty', () => {
      expect(reqAuthRegisterV3('marley@gmail.com', 'Password1234', 'Troll', '')).toStrictEqual(BAD_REQUEST);
    });

    test('Last name length > 50', () => {
      expect(reqAuthRegisterV3('marley@gmail.com', 'Password1234', 'Troll', 'i'.repeat(51))).toStrictEqual(BAD_REQUEST);
    });
  });

  describe(('Valid parameters'), () => {
    const validEmails = [
      { email: 'test@gmail.com' },
      { email: 'test@subdomain.deez.com' },
      { email: 'test@pog-domain.net' },
      { email: 'test@longverygoddamnlongihopethisworks.com' },
      { email: 'numbers123@gmail.com' },
      { email: 'Capital@gmail.com' },
    ];

    test.each(validEmails)('Valid email ($email)', ({ email }) => {
      expect(reqAuthRegisterV3(email, 'ValidPassword123', 'John', 'Smith')).toStrictEqual(AuthIdObject);
    });

    const validPasswords = [
      { password: 'sixsix' },
      { password: 'withnumbers123' },
      { password: '__special_characters' },
      { password: 'CAPSCAPS' },
    ];

    test.each(validPasswords)('Valid password ($password)', ({ password }) => {
      expect(reqAuthRegisterV3('catsarecool@gmail.com', password, 'John', 'Smith')).toStrictEqual(AuthIdObject);
    });

    const validNames = [
      { name: 'a' },
      { name: 'numbers123' },
      { name: 'Capitals' },
      { name: 'Speical_' },
    ];

    test.each(validNames)('Valid first name ($name)', ({ name }) => {
      expect(reqAuthRegisterV3('catsarecool@gmail.com', 'password12345', name, 'Smith')).toStrictEqual(AuthIdObject);
    });

    test.each(validNames)('Valid last name ($name)', ({ name }) => {
      expect(reqAuthRegisterV3('catsarecool@gmail.com', 'password12345', 'Trent', name)).toStrictEqual(AuthIdObject);
    });
  });
});

describe('/auth/logout/v2', () => {
  test('Invalid Token', () => {
    expect(reqAuthLogoutV2('incorrect token!')).toStrictEqual(FORBIDDEN);
  });
  test('Valid Input', () => {
    const token = reqAuthRegisterV3('user@gmail.com', 'password', 'first', 'last').token;
    expect(reqAuthLogoutV2(token)).toStrictEqual({});

    // Test it now causes an error as the token has been invalidated
    expect(reqAuthLogoutV2(token)).toStrictEqual(FORBIDDEN);
  });
});

describe('/auth/passwordreset/request/v1', () => {
  test('invalid Input', () => {
    expect(reqAuthPasswordResetRequestV1('somedude@gmail.com')).toStrictEqual({});
  });
  test('valid Input', () => {
    const token = reqAuthRegisterV3('somedude@gmail.com', 'password123', 'some', 'dude').token;
    expect(reqAuthPasswordResetRequestV1('somedude@gmail.com')).toStrictEqual({});
    expect(reqAuthLogoutV2(token)).toStrictEqual(FORBIDDEN);
  });
});

describe('/auth/passwordreset/reset/v1', () => {
  test('invalid Code', () => {
    reqAuthRegisterV3('somedude@gmail.com', 'password123', 'some', 'dude');
    reqAuthPasswordResetRequestV1('somedude@gmail.com');
    expect(reqAuthPasswordResetV1('0000', 'password')).toStrictEqual(BAD_REQUEST);
  });
  test('invalid Password', () => {
    expect(reqAuthPasswordResetV1('0000', '12345')).toStrictEqual(BAD_REQUEST);
  });
});
