(function() {
  "use strict";

  // import * as sdk from "microsoft-cognitiveservices-speech-sdk";

  // subscription key and region for speech services.
  var speechKey = "f470e25b6841498883626459deb9a1ba";
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
      var lm = SpeechSDK.LanguageUnderstandingModel.fromAppId(appId);

      recognizer.addAllIntents(lm);
    }

    recognizer.recognizeOnceAsync(recognize, errCheck);
  }

  function recognize(result) {
    var jsonResult;
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
        id("phraseDiv").innerHTML += jsonResult + "\r\n";
        giveResponse(jsonResult);
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
    return jsonResult;
  }

  function giveResponse(result) {
    result = JSON.parse(result);
    var text = result.entities[0].entity + "\'s weather is 25 degree.\n" + result.topScoringIntent.intent;
    id("respondDiv").innerHTML += text;

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, serviceRegion);
    const synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig);

    synthesizer.speakTextAsync(text,
      function(result) {
        // const {audioData } = result;
        synthesizer.close();
        // const bufferStream = new PassThrough();
        // bufferStream.end(Buffer.from(audioData));
        // return bufferStream;
        return result.audioData;
      },
      function(error) {
        console.log(error);
        synthesizer.close();
      });
  }

  // function speakResult(result) {
  //   const { audioData } = result;

  //   synthesizer.close();

  //   // convert arrayBuffer to stream
  //   // return stream
  //   const bufferStream = new PassThrough();
  //   bufferStream.end(Buffer.from(audioData));
  //   return bufferStream;
  // }

  function errCheck(err) {
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
})();