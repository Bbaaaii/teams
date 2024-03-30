
zID: z5420471
Chosen bonus feature(s): Hangman 
Explanation (~100 words): I created a playable hangman minigame that can be run with a single user in a channel. The game creates a 'Bot User' and reads input commands from messages sent by the player. 

Typing '/play [setting]' intialises the game with a specific setting. If [setting] is a number between 3-6 the game will randomly choose a word of that length to guess (for instance '/play 3' would generate a random 3 letter word to guess). If [setting] is the name of a category (animals, colours, fruits) a random word from that category will be chosen for the user to guess (for instance '/play animals' would generate the name of a random animal to guess).

The game can also be stopped at any time by running '/stop', helpful command info can also be displayed be running /help. Guesses can be made by typing /guess X where X is a random letter that can be upper or lowercase. You cannot make guesses when a game is not currently being played. 7 incorrect guesses can be made before losing the game, indicated by the ascii hangman figure - missed guesses are also displayed below this ascii art. Upon winning the game the users score is printed (7 - num of incorrect guesses).

Link to Flipgrid video: https://flip.com/s/NNhgz3yyPo5y



Words are randomly generated using this package: https://github.com/sindresorhus/random-word

