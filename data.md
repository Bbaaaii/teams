```javascript
let data = {

  // Below is a sample user object
  users: [
    {
      uId: 123456789,
      email : ‘rishiisverycool@email.com’,
      password: ‘rishiisverycool’,
      nameFirst: ‘Rishi’,
      nameLast: ‘Israni’,
      handleStr: ‘rish’,
    },
  ],

  // Below is a sample channel object
  channels: [
    {
      name:  ‘Rishi Channel’,
      channelId: 987654321,
      isPublic: true,
      ownerMembers: [
        {
          uId: 123456789,
        },
      ],
      allMembers: [
        {
          uId: 123456789,
        },
      ]
      messages: [
        {
          messageId: 4278,
          uId: 123456789,
          message: ‘Hello I am Rishi!’,
          timeSent: 1249743179853,
        },
      ],
    },
  ],

};
```

**Short Description**:

The above data object describes the key-value pairs of a sample user and channel object.

These properties were ideated based on priliminary information provided in the iteration 0 specification, particularly the given interface.

More properties will be added and edited once the full scope and functionality of the provided functions are given in future iterations.
