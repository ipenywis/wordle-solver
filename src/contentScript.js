"use strict";

import memorise from "lru-memorise";
import { wait } from "./utils/promise";
import swal from "sweetalert2";

// Content script file will run in the context of web page.
// With content script you can manipulate the web pages using
// Document Object Model (DOM).
// You can also pass information to the parent extension.

// We execute this script by making an entry in manifest.json file
// under `content_scripts` property

// For more information on Content Scripts,
// See https://developer.chrome.com/extensions/content_scripts

// Log `title` of current active web page
const pageTitle = document.head.getElementsByTagName("title")[0].innerHTML;
// console.log(
//   `Page title is: '${pageTitle}' - evaluated by Chrome extension's 'contentScript.js' file`
// );

const MAX_WORDS = 6; ///< Max words to win the game
const WORD_LENGTH = 5;
let tempWordlist = null;
let found = false;

function resultColorValueToNumber(value) {
  switch (value) {
    case "absent":
      return 0;
    case "present":
      return 1;
    case "correct":
      return 2;
    default:
      return 0;
  }
}

async function readWordlist() {
  const wordlistURL = chrome.extension.getURL("/words.txt");

  console.log(wordlistURL);

  const file = await fetch(wordlistURL).catch((err) => {
    console.log("Error reading worldlist: ", err);
  });

  if (file) return (await file.text()).split("\n");
}

function calculateResponseVector(word1, word2) {
  let tempWord2 = `${word2}`;
  let msum = Array(WORD_LENGTH).fill(0);
  let foundCharacterIndex = 0;

  for (let idx = 0; idx < WORD_LENGTH; idx++) {
    if (word1[idx] === tempWord2[idx]) {
      msum[idx] = 2;
      tempWord2 =
        tempWord2.substring(0, idx) + "*" + tempWord2.substring(idx + 1);
    }
  }

  for (let idx = 0; idx < WORD_LENGTH; idx++) {
    if (tempWord2.includes(word1[idx]) && msum[idx] === 0) {
      msum[idx] = 1;
      foundCharacterIndex = tempWord2.indexOf(word1[idx]);
      tempWord2 =
        tempWord2.substring(0, foundCharacterIndex) +
        "*" +
        tempWord2.substring(foundCharacterIndex + 1);
    }
  }

  return msum;
}

const memorisedCalculateResponseVector = memorise(calculateResponseVector, {
  lruOptions: { max: 10000000000 },
});

/**
 * @param {{[]: []}} wordsMatrix
 * @param {[]} resultInput
 */
function checkIfWon(wordsMatrix, resultInput) {
  if (!resultInput || resultInput.length === 0) {
    console.error("No input!");
    return;
  }

  tempWordlist = wordsMatrix[resultInput];

  if (tempWordlist && tempWordlist.length === 1) {
    found = true;
    return true;
  }

  return false;
}

async function inputWordIntoDom(round, word) {
  const gameRows = document
    .querySelector("game-app")
    .shadowRoot.querySelector("game-theme-manager")
    .querySelectorAll("game-row");

  for (const row of gameRows) {
    const rowElement = row.shadowRoot.querySelector("div");
    const tiles = rowElement.querySelectorAll("game-tile");

    console.log("Row :", rowElement);
    console.log("Tiles :", tiles);

    for (const tile of tiles) {
      const tileElement = tile.shadowRoot.querySelector("div");
      console.log("Tile: ", tileElement);

      tileElement.value = word[0];
    }

    break;
  }
}

async function inputWordIntoDomUsingKeyboard(word) {
  // const keyboardElement = document
  //   .querySelector("game-app")
  //   .shadowRoot.querySelector("game-theme-manager")
  //   .shadowRoot.querySelector("game-keyboard")
  //   .shadowRoot.querySelector("div#keyboard");

  const keyboardElement = document
    .querySelector("body > game-app")
    .shadowRoot.querySelector("#game > game-keyboard")
    .shadowRoot.querySelector("#keyboard");

  const enterButton = keyboardElement.querySelector(`button[data-key="↵"]`);

  for (const character of word) {
    const keyElement = keyboardElement.querySelector(
      `button[data-key="${character}"]`
    );

    await wait(1000);
    keyElement.click();
  }

  await wait(2000);
  enterButton.click();
}

async function readInputResultFromDom(round) {
  const gameRows = document
    .querySelector("game-app")
    .shadowRoot.querySelector("game-theme-manager")
    .querySelectorAll("game-row");

  // for (const row of gameRows) {
  const rowElement = gameRows[round].shadowRoot.querySelector("div");
  const tiles = rowElement.querySelectorAll("game-tile");

  // console.log("Row :", rowElement);
  // console.log("Tiles :", tiles);

  const resultInput = [];

  for (const tile of tiles) {
    const tileElement = tile.shadowRoot.querySelector("div");
    // console.log("Tile: ", tileElement);
    const state = tileElement.getAttribute("data-state");
    console.log("Result Color Value: ", state, resultColorValueToNumber(state));

    resultInput.push(resultColorValueToNumber(state));
  }

  return resultInput;
  // }
}

async function proposeNextWord(wordlist) {
  // console.log("List: ", wordlist, wordlist[0]);
  tempWordlist = [...wordlist];
  for (let round = 0; round < MAX_WORDS; round++) {
    if (found) break;

    let MIN_LENGTH = 100000;
    let chosenWord = "";
    let srmat = {};
    let allWords = [];

    if (round != 0) allWords = wordlist;
    else allWords = ["aesir"];

    for (let word1 of allWords) {
      let mat = {};
      let rmat = {};
      let msum = Array(WORD_LENGTH).fill(0);
      // console.log("word1: ", word1);
      word1 = word1.trim();
      if (!tempWordlist) return false;

      for (let word2 of tempWordlist) {
        // console.log("word2: ", word1);
        word2 = word2.trim();
        msum = memorisedCalculateResponseVector(word1, word2);

        if (!rmat.hasOwnProperty(msum)) {
          rmat[msum] = [word2];
        } else {
          rmat[msum].push(word2);
        }
        mat[[word1, word2]] = msum;
      }

      const MAX = Math.max(...Object.values(rmat).map((arr) => arr.length));

      if (MAX < MIN_LENGTH) {
        MIN_LENGTH = MAX;
        chosenWord = word1;
        srmat = rmat;
      }
    }

    console.log("Finished round: ", round);
    console.log("RMAT is: ", srmat);

    console.log("Chosen word: ", chosenWord);

    // inputWordIntoDom(round, chosenWord);
    await inputWordIntoDomUsingKeyboard(chosenWord);

    await wait(4000);

    const inputResult = await readInputResultFromDom(round);

    console.log("Result ", inputResult);

    await wait(1000);

    // const input = prompt("Enter the result: ");
    // if (!input || input === "") {
    //   console.error("No input!");
    //   return;
    // }

    if (checkIfWon(srmat, inputResult)) {
      console.log("DONE! Final word is ", tempWordlist[0]);
      chosenWord = tempWordlist[0];

      await inputWordIntoDomUsingKeyboard(chosenWord);

      await wait(4000);

      const inputResult = await readInputResultFromDom(round + 1);

      await wait(1000);

      swal.fire("You Won!", "", "success");
    } else {
      alert("Next word...");
      swal.fire("You Won!", "", "success");

      // swal.fire({
      //   title: "Looking for your next word...",
      //   timerProgressBar: true,
      //   timer: 4000,
      // });
      console.log("Looking for your next word...");
      let timerInterval = 0;
      // swal
      //   .fire({
      //     title: "Looking for your next word...",
      //     html: "I will close in <b></b> milliseconds.",
      //     timer: 2000,
      //     timerProgressBar: true,
      //     didOpen: () => {
      //       swal.showLoading();
      //       const b = swal.getHtmlContainer().querySelector("b");
      //       timerInterval = setInterval(() => {
      //         b.textContent = swal.getTimerLeft();
      //       }, 100);
      //     },
      //     willClose: () => {
      //       clearInterval(timerInterval);
      //     },
      //   })
      //   .then((result) => {
      //     /* Read more about handling dismissals below */
      //     if (result.dismiss === swal.DismissReason.timer) {
      //       console.log("I was closed by the timer");
      //     }
      //   });
    }

    // const feedback = input.split(",").map((x) => parseInt(x));
    // console.log("smrat: ", srmat, feedback);
    // tempWordlist = srmat[feedback];

    // if (tempWordlist && tempWordlist.length === 1) {
    //   console.log("DONE! Final word is ", tempWordlist[0]);
    //   found = true;
    //   break;
    // } else {
    //   console.log("Looking for your next word...");
    // }
  }

  if (!found) {
    console.log("Failed! Did no find word after 6 attemps");
  }
}

async function handleGameStart() {
  localStorage.removeItem("gameState");

  const worldlist = await readWordlist();

  console.log("WORLDLIST: ", worldlist);

  proposeNextWord(worldlist);
}

// Listen for message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "START") {
    handleGameStart();
  }

  // Send an empty response
  // See https://github.com/mozilla/webextension-polyfill/issues/130#issuecomment-531531890
  sendResponse({});
  return true;
});
