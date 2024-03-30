import * as fs from 'node:fs/promises';

import { Data } from './types/dataStore';

const DATA_STORE_PATH = 'dataStore.json';

let data: Data = {
  users: [],
  channels: [],
  dms: [],
  profileImages: [],
  reservedMessageIds: [],
  sessionId: 0,
  globalOwners: [],
  removedUsers: [],
  numChannels: 0,
  numDms: 0,
  numMsgs: 0,
  workspaceStats: {
    channelsExist: [],
    dmsExist: [],
    messagesExist: []
  }
};

export function saveData() {
  fs.writeFile(DATA_STORE_PATH, JSON.stringify(data));
}

export function loadData() {
  fs.readFile(DATA_STORE_PATH, 'utf8').then((dataStore) => {
    if (dataStore.length === 0) {
      return;
    }

    data = JSON.parse(dataStore);
  }).catch((err) => {
    if (err.code === 'ENOENT') {
      console.log('No data store found, creating new one');
      saveData();
      return;
    }

    console.error('Unexpected error loading data store - ', err);
  });
}

// YOU SHOULDNT NEED TO MODIFY THE FUNCTIONS BELOW IN ITERATION 1

/*
Example usage
    let store = getData()
    console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Rando'] }

    names = store.names

    names.pop()
    names.push('Jake')

    console.log(store) # Prints { 'names': ['Hayden', 'Tam', 'Rani', 'Giuliana', 'Jake'] }
    setData(store)
*/

// Use get() to access the data
function getData(): Data {
  return data;
}

// Use set(newData) to pass in the entire data object, with modifications made
// - Only needs to be used if you replace the data store entirely
// - Javascript uses pass-by-reference for objects... read more here: https://stackoverflow.com/questions/13104494/does-javascript-pass-by-reference
// Hint: this function might be useful to edit in iteration 2
function setData(newData: Data) {
  data = newData;
}

export { getData, setData };
