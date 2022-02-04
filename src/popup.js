"use strict";

import "./popup.css";

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

  function isOnWordlePage() {
    return window.location.href.includes(WORDLE_WEBPAGE_URL);
  }

  function getPlayButton() {
    return document.querySelector("button#play");
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

  function main() {
    console.log("HERE");
    const playButton = getPlayButton();

    playButton.addEventListener("click", startPlaying);

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
