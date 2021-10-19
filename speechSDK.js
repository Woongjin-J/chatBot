(function() {
  "use strict";

  let SpeechSDK;
  let recognizer;
  const speechKey = "f470e25b6841498883626459deb9a1ba";
  const subscriptionKey = "e7531fd877724d46b2395cb8cf7adfe6";
  const serviceRegion = "westus";
  const appId = "90172fe8-d914-4019-ae6a-e148ac29d755";
  const ONECALL_URL = "https://api.openweathermap.org/data/2.5/onecall{forcast}?lat={lat}&lon={lon}&dt={time}&units=metric&appid=acf380c77f1250015c7e020d4957ee34";
  const COORD_URL = "https://api.openweathermap.org/data/2.5/weather?q=incheon&units=metric&APPID=acf380c77f1250015c7e020d4957ee34";

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    id("talkButton").addEventListener("click", startTalk);

    if (!!window.SpeechSDK) {
      SpeechSDK = window.SpeechSDK;
      id("talkButton").disabled = false;
      id('content').style.display = 'block';
      id('warning').style.display = 'none';
    }
  }

  function startTalk() {
    id("talkButton").disabled = true;
    id("phraseDiv").innerHTML = "";
    id("statusDiv").innerHTML = "";
    id("respondDiv").innerHTML = "";

    if (subscriptionKey === "" || subscriptionKey === "subscription") {
      alert("Please enter your Microsoft Cognitive Services Speech subscription key!");
      id("talkButton").disabled = false;
      return;
    }
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

  function recognize(result) {
    let jsonResult;
    window.console.log(result);
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
    return jsonResult;
  }

  function giveResponse(result) {
    result = JSON.parse(result);

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
    if (len > 0 && entities[len-1].type === "builtin.datetimeV2.date") {
      time = entities[len-1].resolution.values[0].timex;
      givenDate = new Date(time);

      if (givenDate.getDate() === today.getDate()) givenDate = today;
    }
    console.log(parseInt(givenDate.getTime()/1000));
    console.log(parseInt(today.getTime()/1000));

    if (entities.length === 0 || (entities.length === 1 && (entities[0].type === "builtin.datetimeV2.datetime" ||
                                                            entities[0].type === "builtin.datetimeV2.date"))) { // current location
      navigator.geolocation.getCurrentPosition(function(pos) {
          url = ONECALL_URL.replace('{lat}', pos.coords.latitude);
          url = url.replace('{lon}', pos.coords.longitude);
          url = url.replace('{time}', parseInt(givenDate.getTime()/1000));
          url = url.replace('{forcast}', '');
          console.log(url);
          fetch(url)
            .then(checkStatus)
            .then(JSON.parse)
            .then(weather)
            .catch();
      }, error);
    }
    else { // specified location
      let location = entities[0].entity;
      url = COORD_URL.replace('{city}', location);
      fetch(url)
        .then(checkStatus)
        .then(JSON.parse)
        .then(info => {
          url = ONECALL_URL.replace('{lat}', info.coord.lat);
          url = url.replace('{lon}', info.coord.lon);
          url = url.replace('{time}', parseInt(givenDate.getTime()/1000));
          url = url.replace('{forcast}', '');
          return fetch(url);
        })
        .then(checkStatus)
        .then(JSON.parse)
        .then(weather)
        .catch();
    }

    function weather(info) {
      console.log(info);
      if (intent === "Weather.CheckWeatherValue") {
        let condition = update_condition(info.current.weather[0].main);

        if (entities.length === 0 || time === "PRESENT_REF" || givenDate.getDate() === today.getDate()) { // current
          text = "It's currently " + condition + " and the temperature is " + info.current.temp + " celcius degree.\n";
        }
        else if (givenDate < today) { // past
          text = "It was " + condition + " and the temperature was " + info.current.temp + " celcius degree.\n";
        }
        else { // future
          let diff_in_time = givenDate.getTime() - today.getTime();
          let diff_in_days = diff_in_time / (1000 * 3600 * 24);
          condition = update_condition(info.daily[Math.round(diff_in_days)].weather[0].main);
          text = "It will be " + condition + " and the temperature will be " +
                              info.daily[Math.round(diff_in_days)].temp.day + " celcius degree.\n";
        }
      }

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
  }

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

  function error(err) {
    window.console.log(err);
    id("phraseDiv").innerHTML += "ERROR: " + err;
    id("talkButton").disabled = false;
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
})();