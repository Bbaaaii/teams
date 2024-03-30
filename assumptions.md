# Assumptions
- User ids start from 0
- Passwords are stored in plain text and do not have to be unique
- Handle names that already exist will add another to itself, incrementing until it is unique: e.g cat -> cat0 -> cat1 -> cat2 -> ... -> cat1023
- New messages in a channel are added to the start of that channel’s messages array.
- Negative Start index returns empty messages array with end index = -1 (channelMessagesV1)
- Channels are displayed in the order they were created (channelsListAllV1)
- User id may not be an integer (userProfileV1)
- User Ids start at 0 and increase by 1 for each new user
- channel Ids start at 0 and increase by 1 for each new channel
- If a user is not part of any channels, it returns an empty array (channelsListV1)
- Channels are displayed in the order they were created (channelsListV1)

