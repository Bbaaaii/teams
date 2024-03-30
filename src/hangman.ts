import { authRegisterV3 } from './auth';
import { getNextMessageId, getChannel } from './helper';
import { getData } from './dataStore';

import { Message } from './types/message';

const DEFAULT_STATE = 7;

const boardStates = [
`_____
|/       |
|    (ㆆㆆ)
|       /|\\
|        |
|       / \\
|____`,
`_____
|/       |
|    (ㆆㆆ)
|       /|\\
|        |
|       / 
|____`,
`_____
|/       |
|    (ㆆㆆ)
|       /|\\
|        |
|       
|____`,
`_____
|/       |
|    (ㆆㆆ)
|       /|\\
|        
|       
|____`,
`_____
|/       |
|    (ㆆㆆ)
|       /|
|        
|       
|____`,
`_____
|/       |
|    (ㆆㆆ)
|        |
|        
|       
|____`,
`_____
|/       |
|     (ㆆㆆ)
|        
|        
|       
|____`,
`_____
|/       |
|    
|        
|        
|       
|____`,
];
const animalWordList = ['horse', 'cat', 'cow', 'lion', 'sheep', 'pig', 'dolphin', 'goat', 'wolf', 'elephant'];
const colourWordList = ['red', 'green', 'blue', 'purple', 'orange', 'black', 'white', 'yellow'];
const fruitWordList = ['apple', 'strawberries', 'pineapple', 'grape', 'mango', 'orange', 'cherry', 'watermelon', 'dragonfruit', 'banana'];

let inGame = false;

let wordToGuess: string;
let guessProgress: string;

let currentState: number;
let missedGuesses: string;

export function intializeGame(message: string, channelId: number) {
  inGame = true;

  const randomWord = require('random-word');
  wordToGuess = randomWord();

  const goodLengths = [3, 4, 5, 6];
  if (goodLengths.includes(parseInt(message[6])) === true) {
    while (wordToGuess.length !== parseInt(message[6])) {
      wordToGuess = randomWord();
    }
  } else if (message.slice(6) === 'animals') {
    wordToGuess = animalWordList[Math.floor(Math.random() * animalWordList.length)];
  } else if (message.slice(6) === 'colours') {
    wordToGuess = colourWordList[Math.floor(Math.random() * colourWordList.length)];
  } else if (message.slice(6) === 'fruits') {
    wordToGuess = fruitWordList[Math.floor(Math.random() * fruitWordList.length)];
  } else {
    sendBotMessage('Please specify a word length from 3-6 or a category (animals, colours or fruits)', channelId);
    return {};
  }

  // generate string of underscores, reset currentState and missedGuessed
  guessProgress = Array(wordToGuess.length + 1).join('_ ');
  currentState = DEFAULT_STATE;
  missedGuesses = 'Missed Guesses: ';

  const messageBody = boardStates[currentState] + '\n' + missedGuesses + '\n' + guessProgress + '\n';

  // generate first message
  const intialMsg = 'Welcome to Hangman!\n' + messageBody + 'Make a Guess!';

  sendBotMessage(intialMsg, channelId);

  return {};
}

export function makeGuess(message: string, channelId: number) {
  const guessLetter = message[7];

  if (inGame === false) {
    sendBotMessage('Not in a game right now! use /play to start a game!', channelId);
    return {};
  } else if (guessLetter.toLowerCase() === guessLetter.toUpperCase() || guessLetter === undefined) {
    sendBotMessage('Your guess is not a letter, please guess a single letter!', channelId);
    return {};
  }
  let correctGuess = false;
  let incorrectGuess = true;
  if (guessProgress.includes(guessLetter.toLowerCase())) {
    const alreadyGuessedMsg = 'You have already guessed that letter! Guess something else';
    sendBotMessage(alreadyGuessedMsg, channelId);
  } else if (wordToGuess.includes(guessLetter.toLowerCase())) {
    // find indexes to replace (multiply them by 2 to accomodate spaces in )
    const indicesToReplace = [];
    for (let i = 0; i < wordToGuess.length; i++) {
      if (wordToGuess[i] === guessLetter.toLowerCase()) indicesToReplace.push(i * 2);
    }

    // replace indexes, turn guessProgress into an array to replace specific indexes then reconvert into a string
    const arrGuessProgress = guessProgress.split('');
    for (const index of indicesToReplace) {
      arrGuessProgress[index] = guessLetter.toLowerCase();
    }
    guessProgress = arrGuessProgress.join('');

    correctGuess = true;
  } else {
    // update missed guesses and currentState
    missedGuesses = missedGuesses + guessLetter.toLowerCase() + ' ';
    currentState = currentState - 1;
    incorrectGuess = true;
  }

  const messageBody = boardStates[currentState] + '\n' + missedGuesses + '\n' + guessProgress + '\n';
  if (correctGuess && guessProgress.includes('_') === false) {
    message = 'Correct Guess!\n' + messageBody + 'CONGRATULATIONS! YOU WIN!!\n' + 'Your Score: ' + currentState;
    inGame = false;
  } else if (correctGuess) {
    message = 'Correct Guess!\n' + messageBody + 'Make another Guess!';
  } else if (incorrectGuess && currentState === 0) {
    message = 'Incorrect Guess :[\n' + messageBody + 'You Lose... :[\n' + `The Word Was '${wordToGuess}'`;
    inGame = false;
  } else if (incorrectGuess) {
    message = 'Incorrect Guess :[\n' + messageBody + 'Make another Guess!';
  }

  sendBotMessage(message, channelId);
  return {};
}

export function hangmanHelp(channelId: number) {
  const helpMessage = '---------------------------------------------------------------------------------------------------------------------------------------------------------------------------\n' +
    'Welcome to Hangman!\n' +
    'Commands:\n' +
    '/play [setting] - Begins the game, [setting] can be a number from 3-6 specifying word length or a category (animals, fruits, colours).\n' +
    '/guess [guess] - Guesses a letter once a game has started, [guesses] must be only one English letter.\n' +
    '/stop - Stops the game at any time.\n' +
    '---------------------------------------------------------------------------------------------------------------------------------------------------------------------------';

  sendBotMessage(helpMessage, channelId);
  return {};
}

export function stopGame(channelId: number) {
  // turn off game
  inGame = false;

  // send appropriate message
  sendBotMessage('Game has been ended!', channelId);
  return {};
}

function sendBotMessage(message: string, channelId: number) {
  const dataStore = getData();

  // if this is the first time hangman is being intialized, create a bot user
  const botUser = dataStore.users.find((user) => user.email === 'bot@bot.com');
  let botUserId;
  if (botUser === undefined) {
    const newBotUser = authRegisterV3('bot@bot.com', 'botpassword123', 'Hangman', 'Bot');
    botUserId = newBotUser.authUserId;
  } else {
    botUserId = botUser.uId;
  }

  const messageId = getNextMessageId(false);
  const seconds = Math.floor((new Date()).getTime() / 1000);
  const messageObject: Message = {
    messageId: messageId,
    uId: botUserId,
    message: message,
    timeSent: seconds,
    isPinned: false,
    reacts: []
  };

  const channel = getChannel(channelId);
  channel.messages.unshift(messageObject);
  return {};
}
