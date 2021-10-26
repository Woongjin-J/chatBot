(function() {
  "use strict";

  let SpeechSDK;
  let recognizer;
  let synthesizer;
  let record;
  let lang;

  // Speech service Key
  const speechKey = "f470e25b6841498883626459deb9a1ba";

  // LUIS prediction key & region & LUIS app ID (default in English Culture)
  const subscriptionKey = "e7531fd877724d46b2395cb8cf7adfe6";
  const serviceRegion = "westus";
  let appId = "90172fe8-d914-4019-ae6a-e148ac29d755";

  const ONECALL_URL = "https://api.openweathermap.org/data/2.5/onecall{forcast}?lat={lat}&lon={lon}&dt={time}&units={measurement}&appid=acf380c77f1250015c7e020d4957ee34";
  const COORD_URL = "https://api.openweathermap.org/data/2.5/weather?q={city}&units={measurement}&APPID=acf380c77f1250015c7e020d4957ee34";

  document.addEventListener("DOMContentLoaded", init);

  /**
   * Initialize the page.
   */
  function init() {
    record = false;
    lang = "en-US";
    id("talkButton").addEventListener("click", startTalk);
    id("ch").addEventListener("click", function() {
      lang = "zh-CN";
      appId = "79f53564-0a5f-4b4a-b54c-0007ff54dbcf";
      qs("span").innerHTML = "(中文-简体)";
      id("btn-txt").innerHTML = "开始";
      document.documentElement.setAttribute("lang", "zh");
      id("phraseDiv").setAttribute("placeholder", " 点击开始并说 ‘嗨，电脑’ 或 ‘电脑’...");
    });
    id("en").addEventListener("click", function() {
      lang = "en-US";
      appId = "90172fe8-d914-4019-ae6a-e148ac29d755";
      qs("span").innerHTML = "(English)";
      id("btn-txt").innerHTML = "Start";
      document.documentElement.setAttribute("lang", "en");
      id("phraseDiv").setAttribute("placeholder", " Click Start and say 'Hey, Computer' or 'Computer'...");
    });

    if (!!window.SpeechSDK) {
      SpeechSDK = window.SpeechSDK;
      id('content').style.display = 'block';
      id('warning').style.display = 'none';
    }
  }

  /**
   * Clear the text content in the page and starts recording from the microphone.
   */
  function startTalk() {
    record = !record;
    if (record) {
      id("ch").disabled = true;
      id("en").disabled = true;

      let listening = false;
      id("phraseDiv").innerHTML = "";
      id("mic").classList.add("hidden");
      id("record").classList.remove("hidden");
      id("btn-txt").classList.add("hidden");

      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const responseConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, serviceRegion);

      responseConfig.speechSynthesisLanguage = lang;
      responseConfig.enableDictation();
      synthesizer = new SpeechSDK.SpeechSynthesizer(responseConfig);

      speechConfig.speechRecognitionLanguage = lang;
      recognizer = new SpeechSDK.IntentRecognizer(speechConfig, audioConfig);

      // Set up a Language Understanding Model from Language Understanding Intelligent Service (LUIS).
      // See https://www.luis.ai/home for more information on LUIS.
      let lm = SpeechSDK.LanguageUnderstandingModel.fromAppId(appId);
      recognizer.addAllIntents(lm);
      recognizer.startContinuousRecognitionAsync();

      recognizer.recognizing = (s, e) => {
        id("phraseDiv").innerHTML = e.result.text;
      }

      recognizer.recognized = (s, e) => {
        if (e.result.reason == SpeechSDK.ResultReason.RecognizedIntent) {
          if (e.result.intentId === "Command.StartTalking") { // Manually added intent for 'hey computer' and 'computer'
            if (lang === "en-US") {
              if (Math.floor(Math.random() * 2) === 1) {
                synthesize_speech(synthesizer, "I'm listening...");
              } else {
                synthesize_speech(synthesizer, "Uh-huh?");
              }
            } else {
              synthesize_speech(synthesizer, "在");
            }
            listening = true;
          }
          else if (e.result.intentId !== "Computer.Respond" && listening) {
            let div = document.createElement("div");
            let p = document.createElement("p");
            div.setAttribute("id", "requestDiv");
            p.innerHTML = e.result.text;
            div.appendChild(p);
            id("respondBox").appendChild(div);
            id("respondBox").scrollTo(0, id("respondBox").scrollHeight);

            const jsonResult = e.result.properties.getProperty(SpeechSDK.PropertyId.LanguageUnderstandingServiceResponse_JsonResult);
            giveResponse(jsonResult, synthesizer);
            listening = false;
          }

        }
        else if (e.result.reason == SpeechSDK.ResultReason.NoMatch) {
          console.log("NOMATCH: Speech could not be recognized.");
        }
      };

      recognizer.canceled = (s, e) => {
        console.log(`CANCELED: Reason=${e.reason}`);

        if (e.reason == SpeechSDK.CancellationReason.Error) {
            console.log(`"CANCELED: ErrorCode=${e.errorCode}`);
            console.log(`"CANCELED: ErrorDetails=${e.errorDetails}`);
            console.log("CANCELED: Did you update the key and location/region info?");
        }

        recognizer.stopContinuousRecognitionAsync();
      };

      recognizer.sessionStopped = (s, e) => {
        console.log("\n    Session stopped event.");
        recognizer.stopContinuousRecognitionAsync();
      };
    } else {
      id("ch").disabled = false;
      id("en").disabled = false;
      id("mic").classList.remove("hidden");
      id("record").classList.add("hidden");
      id("btn-txt").classList.remove("hidden");
      recognizer.stopContinuousRecognitionAsync();
    }
  }

  /**
   * Determines the request and return the requested information (i.e. current weather).
   * @param {JSON} result Speech intent recognition result
   */
  function giveResponse(result, synthesizer) {
    result = JSON.parse(result); // Convert to JS readable JSON
    console.log(result);

    let url;
    let intent = result.topScoringIntent.intent;
    let entities = result.entities;
    let text = "Sorry, I don't understand.";
    if (lang === "zh-CN") text = "对不起，我不明白你的意思。";

    let givenDate = new Date();
    let today = new Date();
    let len = entities.length;
    let time;

    let measurement = "metric";
    let unit = "°C";
    for (let i = 0; i < len; i++) {
      if (entities[i].type === "builtin.temperature") {
        if (entities[i].entity === "celsius" || entities[i].entity === "摄氏") {
          measurement = "metric";
          unit = "°C";
        } else if (entities[i].entity === "fahrenheit" || entities[i].entity === "华氏") {
          measurement = "imperial";
          unit = "°F";
        } else {
          measurement = "standard"; // Kelvin
          unit = "°K";
        }
        break;
      }
    }

    // Update the givenDate if it's not the current date
    if (len > 0) {
      if (entities[len-1].type === "builtin.datetimeV2.date" ||
          entities[len-1].type === "builtin.datetimeV2.datetime") {
        time = entities[len-1].resolution.values[0].value;
        givenDate = new Date(time);
        if (givenDate.getDate() === today.getDate()) givenDate = today;
      }
      else if (entities[len-1].type === "builtin.datetimeV2.duration") {
        time = today.getTime() + entities[len-1].resolution.values[0].value * 1000;
        givenDate = new Date(time);
      }
    }

    let diff_in_time = Math.abs(today.getTime() - givenDate.getTime());
    let diff_in_days = diff_in_time / (1000 * 3600 * 24);

    if (is_current_location(entities, len)) { // current location
      navigator.geolocation.getCurrentPosition(function(pos) {
          time = parseInt(givenDate.getTime() / 1000);
          url = ONECALL_URL.replace('{lat}', pos.coords.latitude);
          url = url.replace('{lon}', pos.coords.longitude);
          url = url.replace('{time}', time);
          url = url.replace('{measurement}', measurement);

          if (!checkDate(givenDate, today, diff_in_days, synthesizer)) return;

          if (givenDate < today) { // past
            url = url.replace('{forcast}', '/timemachine');
          }
          else { // present & future
            url = url.replace('{forcast}', '');
          }

          fetch(url)
            .then(checkStatus)
            .then(JSON.parse)
            .then(weather)
            .catch();
      }, error);
    }
    else { // specified location
      let city = geography(entities, len);
      url = COORD_URL.replace('{city}', city);
      fetch(url)
        .then(checkStatus)
        .then(JSON.parse)
        .then(info => {
          url = ONECALL_URL.replace('{lat}', info.coord.lat);
          url = url.replace('{lon}', info.coord.lon);
          url = url.replace('{time}', parseInt(givenDate.getTime()/1000));
          url = url.replace('{measurement}', measurement);

          if (!checkDate(givenDate, today, diff_in_days, synthesizer)) return;

          if (givenDate < today) { // past
            url = url.replace('{forcast}', '/timemachine');
          }
          else { // present & future
            url = url.replace('{forcast}', '');
          }
          return fetch(url);
        })
        .then(checkStatus)
        .then(JSON.parse)
        .then(weather)
        .catch();
    }

    /**
     * Prints out the weather condition and output the speech through speaker.
     * @param {JSON} info information about the weather
     */
    function weather(info) {
      console.log(info);

      let condition = update_condition(info.current.weather[0].main);
      if (intent === "Weather.CheckWeatherValue") {
        if (givenDate.getDate() === today.getDate()) { // present
          if (lang === "en-US") {
            text = "It's ";
            if (condition === "thunderstorm" || (info.current.weather[0].id > 700 && info.current.weather[0].id < 800 && condition !== "foggy")) {
              text = "There's ";
            }
            text += "currently " + condition + " and the temperature is " + info.current.temp + unit + ".\n";
          } else {
            text = "现在" + condition + ", 温度是" + info.current.temp + unit + "。\n";
          }
        }
        else if (givenDate < today) { // past
          if (lang === "en-US") {
            text = "It was ";
            if (condition === "thunderstorm" || (info.current.weather[0].id > 700 && info.current.weather[0].id < 800 && condition !== "foggy")) {
              text = "There was ";
            }
            text += condition + " and the temperature was " + info.current.temp + unit + ".\n";
          } else {
            text = entities[len-1].entity + condition + "，温度是" + info.current.temp + unit + "。\n";
          }
        }
        else { // future
          condition = update_condition(info.daily[Math.round(diff_in_days)].weather[0].main);
          if (lang === "en-US") {
            text = "It's expected to be ";
            if (condition === "thunderstorm" || (info.current.weather[0].id > 700 && info.current.weather[0].id < 800 && condition !== "foggy")) {
              text = "It's expected to have ";
            }
            text += condition + " and the high will be " +
                    info.daily[Math.round(diff_in_days)].temp.max + unit + " and the low at " +
                    info.daily[Math.round(diff_in_days)].temp.min + ".\n";
          } else {
            text = entities[len-1].entity + condition + "，最高温是" +
                    info.daily[Math.round(diff_in_days)].temp.max + unit + "，最低温是" +
                    info.daily[Math.round(diff_in_days)].temp.min + ".\n";
          }
        }
      }
      else if (intent === "Weather.ChangeTemperatureUnit") {
        if (givenDate.getDate() === today.getDate()) { // present
          if (lang === "en-US") {
            text = "It's currently " + info.current.temp + unit + ".\n";
          } else {
            text = "现在是" + info.current.temp + unit + "。\n";
          }
        }
        else if (givenDate < today) { // past
          if (lang === "en-US") {
            text = "It was " + info.current.temp + unit + ".\n";
          } else {
            text = entities[len-1].entity + "是" + info.current.temp + unit + "。\n";
          }
        }
        else { // future
          if (lang === "en-US") {
            text = "The high is expected to be " + info.daily[Math.round(diff_in_days)].temp.max + unit +
                  " and the low at " + info.daily[Math.round(diff_in_days)].temp.min + ".\n";
          } else {
            text = entities[len-1].entity + "最高温是" + info.daily[Math.round(diff_in_days)].temp.max + unit +
                  "最低温是" + info.daily[Math.round(diff_in_days)].temp.min + "。\n";
          }
        }
      }
      else if (intent === "Weather.GetWeatherAdvisory") {
        if (givenDate.getDate() === today.getDate()) { // present
          if (info.alerts) {
            text = info.alerts[0].description;
          } else {
            text = "I don't have any weather advisory for you right now. The weather is currently " +
                   condition + " with the temperature at " + info.current.temp + unit + ".\n";
          }
        }
        else if (givenDate > today) { // future
          if (info.alerts) {
            text = info.alerts[0].description;
          } else {
            condition = update_condition(info.daily[Math.round(diff_in_days)].weather[0].main);
            text = "I don't have any weather advisory for you right now. The weather is expected to be " +
                   condition + " and the high will be " + info.daily[Math.round(diff_in_days)].temp.max +
                   unit + " and the low at " + info.daily[Math.round(diff_in_days)].temp.min + ".\n";
          }
        }
      }
      synthesize_speech(synthesizer, text);
    }
  }

  /**
   * Converts the returning text message into audio output to play out through the speaker.
   * Displays the returning text message in the respond block.
   * @param {SpeechSDK} synthesizer Converts text into audio output
   * @param {String} text Output text
   */
  function synthesize_speech(synthesizer, text) {
    synthesizer.speakTextAsync(text,
      function(result) {
        // synthesizer.close();
        return result.audioData;
      },
      function(error) {
        console.log(error);
        synthesizer.close();
      });

    // id("respondDiv").innerHTML += text;
    let div = document.createElement("div");
    let p = document.createElement("p");
    div.setAttribute("id", "respondDiv");
    p.innerHTML = text;
    div.appendChild(p);
    id("respondBox").appendChild(div);
    id("respondBox").scrollTo(0, id("respondBox").scrollHeight);
  }

  /**
   * Converts the noun phrase to adjective
   * @param {String} condition The weather condition
   * @returns condition Converted string
   */
  function update_condition(condition) {
    if (condition === "Clouds") {
      condition = "cloudy";
      if (lang === "zh-CN") {
        condition = "多云";
      }
    } else if (condition === "Rain") {
      condition = "raining";
      if (lang === "zh-CN") {
        condition = "有雨";
      }
    } else if (condition === "Fog" || condition === "Mist" || condition === "Haze") {
      condition = "foggy";
      if (lang === "zh-CN") {
        condition = "有雾";
      }
    } else if (condition === "Snow") {
      condition = "snowing";
      if (lang === "zh-CN") {
        condition = "有雪";
      }
    } else if (condition === "Drizzle") {
      condition = "drizzling";
      if (lang === "zh-CN") {
        condition = "有毛毛雨";
      }
    } else {
      condition = condition.toLowerCase();
      if (lang === "zh-CN") {
        if (condition === "Thunderstrom") {
          condition = "有雷暴";
        } else if (condition === "clear") {
          condition = "天晴";
        } else if (condition === "Smoke") {
          condition = "有烟雾";
        } else if (condition === "Dust" || condition === "Ash") {
          condition = "有灰尘";
        } else if (condition === "Sand") {
          condition = "有沙尘";
        } else if (condition === "Squall") {
          condition = "有飙风";
        } else {
          condition = "有龙卷风";
        }
      }
    }
    return condition;
  }

  /**
   * Determines whether the speech is referring to current location.
   * @param {Array} entities List of entities recognized
   * @param {int} len length of the entities list
   * @returns {Boolean}
   */
  function is_current_location(entities, len) {
    for (let i = 0; i < len; i++) {
      if (entities[i].type === "builtin.geographyV2.city") return false;
    }
    return true;
  }

  /**
   * Check if the date requested is out of range
   * @param {String} givenDate
   * @param {String} today
   * @param {Int} diff_in_days
   * @param {Object} synthesizer
   * @returns {Boolean}
   */
  function checkDate(givenDate, today, diff_in_days, synthesizer) {
    let text;
    if (givenDate < today) { // past
      if (diff_in_days > 5) {
        if (lang === "en-US") {
          text = "Sorry, I can only look back the weather up to 5 days ago.";
        } else {
          text = "对不起，我最多只能查看五天前的天气。"
        }
        synthesize_speech(synthesizer, text);
        return false;
      }
    }
    else { // present & future
      if (diff_in_days > 7) {
        if (lang === "en-US") {
          text = "Sorry, I can only foresee the weather up to 7 days after.";
        } else {
          text = "对不起，我只能预测七天内的天气。";
        }
        synthesize_speech(synthesizer, text);
        return false;
      }
    }
    return true;
  }

  /**
   * finds the city name in the speech. If not specified, return empty string.
   * @param {Array} entities recognized entities
   * @returns city name (empty string otherwise)
   */
  function geography(entities, len) {
    for (let i = 0; i < len; i++) {
      if (entities[i].type === "builtin.geographyV2.city") return entities[i].entity;
    }
    return "";
  }




  /* ------------------------------ Helper Functions  ------------------------------ */
  // Note: You may use these in your code, but do remember that your code should not have
  // any functions defined that are unused.

  /**
   * Returns the element that has the ID attribute with the specified value.
   * @param {string} idName - element ID
   * @returns {object} DOM object associated with id.
   */
  function id(idName) {
    return document.getElementById(idName);
  }

  /**
   * Returns the first element that matches the given CSS selector.
   * @param {string} selector - CSS query selector.
   * @returns {object} The first DOM object matching the query.
   */
    function qs(selector) { // less common, but you may find it helpful
    return document.querySelector(selector);
  }

  /**
   * Returns all the element that matches the given css selector.
   * @param  {[type]} selector - CSS query selector.
   * @return {[type]} All DOM object matching the query.
   */
  function qsa(selector) {
    return document.querySelectorAll(selector);
  }

  /**
  *  Function to check the status of an Ajax call, boiler plate code to include,
  *  based on: https://developers.google.com/web/updates/2015/03/introduction-to-fetch
  *  updated from
  *  https://stackoverflow.com/questions/29467426/fetch-reject-promise-with-json-error-object
  *  @param {Object} response the response text from the url call
  *  @return {Object} did we succeed or not, so we know whether or not to continue with the
  *  handling of this promise
  */
   function checkStatus(response) {
    if (response.status >= 200 && response.status < 300) {
      return response.text();
    } else {
      return Promise.reject(new Error(response.status + ": " + response.statusText));
    }
  }

  /**
   * Update the page with an error message if error occured
   * @param {String} err Error message
   */
  function error(err) {
    window.console.log(err);
    id("phraseDiv").innerHTML += "ERROR: " + err;
    id("talkButton").disabled = false;
  }
})();