(function() {
  "use strict";

  // status fields and start button in UI
  var phraseDiv;
  var statusDiv;
  var talkButton;

  // subscription key and region for speech services.
  var subscriptionKey = "e7531fd877724d46b2395cb8cf7adfe6";
  var serviceRegion = "westus";
  var appId = "90172fe8-d914-4019-ae6a-e148ac29d755";
  var SpeechSDK;
  var recognizer;

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

    let audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    if (subscriptionKey === "" || subscriptionKey === "subscription") {
      alert("Please enter your Microsoft Cognitive Services Speech subscription key!");
      id("talkButton").disabled = false;
      return;
    }
    var speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

    speechConfig.speechRecognitionLanguage = "en-US";
    recognizer = new SpeechSDK.IntentRecognizer(speechConfig, audioConfig);

    // Set up a Language Understanding Model from Language Understanding Intelligent Service (LUIS).
    // See https://www.luis.ai/home for more information on LUIS.
    if (appId !== "" && appId !== "YOUR_LANGUAGE_UNDERSTANDING_APP_ID") {
      var lm = SpeechSDK.LanguageUnderstandingModel.fromAppId(appId);

      recognizer.addAllIntents(lm);
    }

    recognizer.recognizeOnceAsync(
      function (result) {
        window.console.log(result);
        // window.console.log("it's recording");
        id("phraseDiv").innerHTML = result.text + "\r\n";

        id("statusDiv").innerHTML += "(continuation) Reason: " + SpeechSDK.ResultReason[result.reason];
        switch (result.reason) {

          case SpeechSDK.ResultReason.RecognizedSpeech:
            id("statusDiv").innerHTML += " Text: " + result.text;
            break;

          case SpeechSDK.ResultReason.RecognizedIntent:
            id("statusDiv").innerHTML += " Text: " + result.text + " IntentId: " + result.intentId;

            // The actual JSON returned from Language Understanding is a bit more complex to get to, but it is available for things like
            // the entity name and type if part of the intent.
            id("statusDiv").innerHTML += " Intent JSON: " + result.properties.getProperty(SpeechSDK.PropertyId.LanguageUnderstandingServiceResponse_JsonResult);
            id("phraseDiv").innerHTML += result.properties.getProperty(SpeechSDK.PropertyId.LanguageUnderstandingServiceResponse_JsonResult) + "\r\n";
            break;

          case SpeechSDK.ResultReason.NoMatch:
            var noMatchDetail = SpeechSDK.NoMatchDetails.fromResult(result);
            id("statusDiv").innerHTML += " NoMatchReason: " + SpeechSDK.NoMatchReason[noMatchDetail.reason];
            break;

          case SpeechSDK.ResultReason.Canceled:
            var cancelDetails = SpeechSDK.CancellationDetails.fromResult(result);
            id("statusDiv").innerHTML += " CancellationReason: " + SpeechSDK.CancellationReason[cancelDetails.reason];

            if (cancelDetails.reason === SpeechSDK.CancellationReason.Error) {
              id("statusDiv").innerHTML += ": " + cancelDetails.errorDetails;
            }
            break;
        }
        id("statusDiv").innerHTML += "\r\n";
        id("talkButton").disabled = false;
      },
      function (err) {
        window.console.log(err);

        id("phraseDiv").innerHTML += "ERROR: " + err;
        id("talkButton").disabled = false;
    });
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
})();