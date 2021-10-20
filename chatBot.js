(function() {
  "use strict";

  let SpeechSDK;
  let recognizer;
  const speechKey = "f470e25b6841498883626459deb9a1ba";
  const subscriptionKey = "e7531fd877724d46b2395cb8cf7adfe6";
  const serviceRegion = "westus";
  const appId = "90172fe8-d914-4019-ae6a-e148ac29d755";
  const ONECALL_URL = "https://api.openweathermap.org/data/2.5/onecall{forcast}?lat={lat}&lon={lon}&dt={time}&units={measurement}&appid=acf380c77f1250015c7e020d4957ee34";
  const COORD_URL = "https://api.openweathermap.org/data/2.5/weather?q={city}&units={measurement}&APPID=acf380c77f1250015c7e020d4957ee34";

  document.addEventListener("DOMContentLoaded", init);

  /**
   * Initialize the page.
   */
  function init() {
    id("talkButton").addEventListener("click", startTalk);

    if (!!window.SpeechSDK) {
      SpeechSDK = window.SpeechSDK;
      id("talkButton").disabled = false;
      id('content').style.display = 'block';
      id('warning').style.display = 'none';
    }
  }

  /**
   * Clear the text content in the page and starts recording from the microphone.
   */
  function startTalk() {
    id("talkButton").disabled = true;
    id("phraseDiv").innerHTML = "";
    id("statusDiv").innerHTML = "";
    id("respondDiv").innerHTML = "";

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();

    speechConfig.speechRecognitionLanguage = "en-US";
    recognizer = new SpeechSDK.IntentRecognizer(speechConfig, audioConfig);

    // Set up a Language Understanding Model from Language Understanding Intelligent Service (LUIS).
    // See https://www.luis.ai/home for more information on LUIS.
    if (appId !== "" && appId !== "YOUR_LANGUAGE_UNDERSTANDING_APP_ID") {
      let lm = SpeechSDK.LanguageUnderstandingModel.fromAppId(appId);
      recognizer.addAllIntents(lm);
    }
    recognizer.recognizeOnceAsync(recognize, error);
  }

  /**
   * Prints out the speech recorded and the result of intent recognition.
   * If no intent matched, prints out the speech text only.
   * @param {Object} result Speech intent recognition result
   */
  function recognize(result) {
    let jsonResult;
    // window.console.log(result);
    id("phraseDiv").innerHTML = result.text + "\r\n";
    id("statusDiv").innerHTML += "(continuation) Reason: " + SpeechSDK.ResultReason[result.reason] + "\r\n";
    switch (result.reason) {

      case SpeechSDK.ResultReason.RecognizedSpeech:
        id("statusDiv").innerHTML += " Text: " + result.text;
        break;

      case SpeechSDK.ResultReason.RecognizedIntent:
        id("statusDiv").innerHTML += " Text: " + result.text + " IntentId: " + result.intentId + "\r\n";

        // The actual JSON returned from Language Understanding is a bit more complex to get to, but it is available for things like
        // the entity name and type if part of the intent.
        jsonResult = result.properties.getProperty(SpeechSDK.PropertyId.LanguageUnderstandingServiceResponse_JsonResult);
        id("statusDiv").innerHTML += " Intent JSON: " + jsonResult + "\r\n";
        giveResponse(jsonResult);
        break;

      case SpeechSDK.ResultReason.NoMatch:
        let noMatchDetail = SpeechSDK.NoMatchDetails.fromResult(result);
        id("statusDiv").innerHTML += " NoMatchReason: " + SpeechSDK.NoMatchReason[noMatchDetail.reason];
        break;

      case SpeechSDK.ResultReason.Canceled:
        let cancelDetails = SpeechSDK.CancellationDetails.fromResult(result);
        id("statusDiv").innerHTML += " CancellationReason: " + SpeechSDK.CancellationReason[cancelDetails.reason];

        if (cancelDetails.reason === SpeechSDK.CancellationReason.Error) {
          id("statusDiv").innerHTML += ": " + cancelDetails.errorDetails;
        }
        break;
    }
    id("statusDiv").innerHTML += "\r\n";
    id("talkButton").disabled = false;
  }

  /**
   * Determines the request and return the requested information (i.e. current weather).
   * @param {JSON} result Speech intent recognition result
   */
  function giveResponse(result) {
    result = JSON.parse(result); // Convert to JS readable JSON

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, serviceRegion);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);
    let intent = result.topScoringIntent.intent;
    let entities = result.entities;
    let text = "Sorry, I don't understand.";
    let url;

    let givenDate = new Date();
    let today = new Date();
    let len = entities.length;
    let time;

    let measurement = "metric";
    let unit = "°C";
    for (let i = 0; i < len; i++) {
      if (entities[i].type === "builtin.temperature") {
        if (entities[i].entity === "celsius") {
          measurement = "metric";
          unit = "°C";
        } else if (entities[i].entity === "fahrenheit") {
          measurement = "imperial";
          unit = "°F";
        } else {
          measurement = "standard"; // Kelvin
          unit = "°K";
        }
        break;
      }
    }

    ////////////// work on this; probably need to loop through? /////////
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

    let diff_in_time = today.getTime() - givenDate.getTime();
    let diff_in_days = diff_in_time / (1000 * 3600 * 24);

    if (is_current_location(entities, len)) { // current location
      navigator.geolocation.getCurrentPosition(function(pos) {
          time = parseInt(givenDate.getTime() / 1000);
          url = ONECALL_URL.replace('{lat}', pos.coords.latitude);
          url = url.replace('{lon}', pos.coords.longitude);
          url = url.replace('{time}', time);
          url = url.replace('{measurement}', measurement);

          if (givenDate < today) { // past
            if (diff_in_days > 5) {
              text = "Sorry, I can only look back the weather up to 5 days ago.";
              synthesize_speech(synthesizer, text);
              return;
            }
            url = url.replace('{forcast}', '/timemachine');
          }
          else { // present & future
            if (diff_in_days > 7) {
              text = "Sorry, I can only foresee the weather up to 7 days after.";
              synthesize_speech(synthesizer, text);
              return;
            }
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
      if (diff_in_days > 7) {
        text = "Sorry, I can only foresee the weather up to 7 days after.";
        synthesize_speech(synthesizer, text);
        return;
      }
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
          url = url.replace('{forcast}', '');
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
        if (len === 0 || givenDate.getDate() === today.getDate()) { // present
          text = "It's currently " + condition + " and the temperature is " + info.current.temp + unit + ".\n";
        }
        else if (givenDate < today) { // past
          text = "It was " + condition + " and the temperature was " + info.current.temp + unit + ".\n";
        }
        else { // future
          condition = update_condition(info.daily[Math.round(diff_in_days)].weather[0].main);
          text = "It's expected to be " + condition + " and the high will be " +
                  info.daily[Math.round(diff_in_days)].temp.max + unit + " and the low at " +
                  info.daily[Math.round(diff_in_days)].temp.min + ".\n";
        }
      }
      else if (intent === "Weather.ChangeTemperatureUnit") {
        if (len === 0 || givenDate.getDate() === today.getDate()) { // present
          text = "It's currently " + info.current.temp + unit + ".";
        }
        else if (givenDate < today) { // past
          text = "It was " + info.current.temp + unit + ".\n";
        }
        else { // future
          text = "The high is expected to be " + info.daily[Math.round(diff_in_days)].temp.max + unit +
                 " and the low at " + info.daily[Math.round(diff_in_days)].temp.min + ".\n";
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
        synthesizer.close();
        return result.audioData;
      },
      function(error) {
        console.log(error);
        synthesizer.close();
      });

    id("respondDiv").innerHTML += text;
  }

  /**
   * Converts the noun phrase to adjective
   * @param {String} condition The weather condition
   * @returns condition Converted string
   */
  function update_condition(condition) {
    if (condition === "Clouds") {
      condition = "cloudy";
    } else if (condition === "Rain") {
      condition = "raining";
    } else if (condition === "Mist") {
      condition = "foggy";
    } else {
      condition = condition.toLowerCase();
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
    if (len === 0) return true;

    for (let i = 0; i < len; i++) {
      if (entities[i].type === "builtin.geographyV2.city") return false;
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