"use strict";

import "./popup.css";
import { GAME_STATE, setGameCurrentState } from "./common";

const WORDLE_WEBPAGE_URL = "https://www.powerlanguage.co.uk/wordle/";
(function () {
  // We will make use of Storage API to get and store `count` value
  // More information on Storage API can we found at
  // https://developer.chrome.com/extensions/storage

  // To get storage access, we have to mention it in `permissions` property of manifest.json file
  // More information on Permissions can we found at
  // https://developer.chrome.com/extensions/declare_permissions
  // const counterStorage = {
  //   get: (cb) => {
  //     chrome.storage.sync.get(["count"], (result) => {
  //       cb(result.count);
  //     });
  //   },
  //   set: (value, cb) => {
  //     chrome.storage.sync.set(
  //       {
  //         count: value,
  //       },
  //       () => {
  //         cb();
  //       }
  //     );
  //   },
  // };

  const gameStateElement = document.getElementById("game-state");
  const wonElement = document.getElementById("won");
  const playButton = document.querySelector("button#play");
  const resetGameButton = document.querySelector("button#reset-game");

  function initElements() {}

  function isOnWordlePage() {
    return window.location.href.includes(WORDLE_WEBPAGE_URL);
  }

  function startPlaying() {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      var activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {
        type: "START",
        message: "start",
      });
    });
  }

  function resetGame() {
    chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
      var activeTab = tabs[0];
      chrome.tabs.sendMessage(activeTab.id, {
        type: "RESET",
        message: "reset",
      });
    });
  }

  function checkGameState() {
    chrome.storage.local.get(["gameState"], (result) => {
      resetGameButton.disabled = false;
      if (result.gameState === GAME_STATE.PLAYING) {
        gameStateElement.innerText = "Game In Progress";
        playButton.disabled = true;
        resetGameButton.disabled = true;
      } else if (result.gameState === GAME_STATE.WON) {
        gameStateElement.innerText = "Won";
        wonElement.style.display = "flex";
        playButton.disabled = false;
        resetGameButton.disabled = false;
      } else {
        gameStateElement.innerText = "Ready";
        playButton.disabled = false;
      }
    });
  }

  function listenForStorageChanges() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local") {
        checkGameState();
      }
    });
  }

  async function main() {
    checkGameState();
    listenForStorageChanges();

    // if (!isAlreadyWonGame) {
    //   console.log("NOT WON");
    //   setGameCurrentState(GAME_STATE.READY);
    // }

    checkGameState();

    playButton.addEventListener("click", startPlaying);
    resetGameButton.addEventListener("click", resetGame);

    if (isOnWordlePage()) {
      playButton.disabled = false;
    }
  }

  document.addEventListener("DOMContentLoaded", main);

  // main();

  // Communicate with background file by sending a message
  // chrome.runtime.sendMessage(
  //   {
  //     type: "GREETINGS",
  //     payload: {
  //       message: "Hello, my name is Pop. I am from Popup.",
  //     },
  //   },
  //   (response) => {
  //     console.log(response.message);
  //   }
  // );
})();
