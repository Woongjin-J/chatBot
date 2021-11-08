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

  // Translator key
  const translatorKey = "36bb6d70543b4fc69134aa9469548009";
  const translatorRegion = "westus2";

  // API url links
  // ONECALL_URL: weather informations
  // COORD_URL: API to retrieve the geological location (latitute & longitude)
  const ONECALL_URL = "https://api.openweathermap.org/data/2.5/onecall{forcast}?lat={lat}&lon={lon}&dt={time}&units={measurement}&appid=acf380c77f1250015c7e020d4957ee34";
  const COORD_URL = "https://api.openweathermap.org/data/2.5/weather?q={city}&units={measurement}&APPID=acf380c77f1250015c7e020d4957ee34";

  // Search key
  const searchKey = "63ddfb9f83a644aca55a58f12c392697";
  const term = "Microsoft Bing Search Services";

  document.addEventListener("DOMContentLoaded", init);

  /**
   * Initialize the page.
   */
  function init() {
    record = false;
    lang = "en-US";
    id("talkButton").addEventListener("click", start_talk);
    id("ch").addEventListener("click", change_to_chinese);
    id("en").addEventListener("click", change_to_english);

    if (!!window.SpeechSDK) {
      SpeechSDK = window.SpeechSDK;
      id('content').style.display = 'block';
      id('warning').style.display = 'none';
    }
  }

  /**
   * Changes the language to Chinese Simplified.
   */
  function change_to_chinese() {
    lang = "zh-CN";
    appId = "79f53564-0a5f-4b4a-b54c-0007ff54dbcf";
    qs("span").innerHTML = "(中文-简体)";
    id("btn-txt").innerHTML = "开始";
    document.documentElement.setAttribute("lang", "zh");
    id("phraseDiv").setAttribute("placeholder", " 点击开始并说 ‘嗨，电脑’ 或 ‘电脑’...");
  }

  /**
   * Changes the language to English (US).
   */
  function change_to_english() {
    lang = "en-US";
    appId = "90172fe8-d914-4019-ae6a-e148ac29d755";
    qs("span").innerHTML = "(English)";
    id("btn-txt").innerHTML = "Start";
    document.documentElement.setAttribute("lang", "en");
    id("phraseDiv").setAttribute("placeholder", " Click Start and say 'Hey, Computer' or 'Computer'...");
  }

  /**
   * Clear the text content in the page and starts recording from the microphone.
   */
  function start_talk() {
    record = !record;
    if (record) {
      id("ch").disabled = true;
      id("en").disabled = true;
      id("phraseDiv").innerHTML = "";
      id("mic").classList.add("hidden");
      id("record").classList.remove("hidden");
      id("btn-txt").classList.add("hidden");

      const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
      const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
      const responseConfig = SpeechSDK.SpeechConfig.fromSubscription(speechKey, serviceRegion);

      speechConfig.speechRecognitionLanguage = lang;
      responseConfig.speechSynthesisLanguage = lang;
      responseConfig.enableDictation();

      recognizer = new SpeechSDK.IntentRecognizer(speechConfig, audioConfig);
      synthesizer = new SpeechSDK.SpeechSynthesizer(responseConfig);

      // Set up a Language Understanding Model from Language Understanding Intelligent Service (LUIS).
      // See https://www.luis.ai/home for more information on LUIS.
      let lm = SpeechSDK.LanguageUnderstandingModel.fromAppId(appId);
      recognizer.addAllIntents(lm);

      recognize_speech(recognizer, responseConfig);
    } else {
      stop_recognition(recognizer);
    }
  }

  /**
   * Continuously recognizing the speech recorded from the default microphone.
   * Also respond to the speech recorded.
   * @param {SpeachSDK} recognizer
   * @param {SpeachSDK} responseConfig
   */
  function recognize_speech(recognizer, responseConfig) {
    let listening = false;
    recognizer.startContinuousRecognitionAsync();
    recognizer.recognizing = (s, e) => {
      id("phraseDiv").innerHTML = e.result.text;
    }

    recognizer.recognized = (s, e) => {
      synthesizer = new SpeechSDK.SpeechSynthesizer(responseConfig);
      if (e.result.reason == SpeechSDK.ResultReason.RecognizedIntent) {
        if (e.result.intentId === "Command.StartTalking") { // Manually added intent 'Command.StartTalking' on LUIS
          let text;
          if (lang === "en-US") {
            if (Math.floor(Math.random() * 2) === 1) {
              text = "I'm listening...";
            } else {
              text = "Uh-huh?";
            }
          } else {
            text = "在";
          }
          synthesize_speech(text);
          display_result(text);
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
          giveResponse(JSON.parse(jsonResult));
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
  }

  /**
   * Determines the request and return the requested information (i.e. current weather).
   * @param {JSON} result Speech intent recognition result
   */
  async function giveResponse(result) {
    let intent = result.topScoringIntent.intent;
    let entities = result.entities;

    if (intent === "Weather.CheckWeatherValue" || intent === "Weather.ChangeTemperatureUnit"
                                               || intent === "Weather.GetWeatherAdvisory") {
      weather_request(intent, entities);
    }
    else if (intent === "HomeAutomation.TurnOn" || intent === "HomeAutomation.TurnOff"
                                                || intent === "HomeAutomation.SetDevice") {
      home_automation(intent, entities);
    } else if (intent === "Web.WebSearch") {
      web_search(entities);
    }
  }


  /* ---------------------------- Weather Request Start ---------------------------- */
  /**
   * Determines the weather request and respond with both text and audio
   * @param {String} intent
   * @param {JSON} entities
   */
  async function weather_request(intent, entities) {
    let url;
    let len = entities.length;
    let unit = update_unit(entities);

    // Update the givenDate if it's not the current date
    let today = new Date();
    let givenDate = today;
    if (len > 0) {
      if (entities[len-1].type === "builtin.datetimeV2.date" ||
          entities[len-1].type === "builtin.datetimeV2.datetime") {
        givenDate = new Date(entities[len-1].resolution.values[0].value);
        if (givenDate.getDate() === today.getDate()) {
          givenDate = today;
        }
      }
      else if (entities[len-1].type === "builtin.datetimeV2.duration") {
        givenDate = new Date(today.getTime() + entities[len-1].resolution.values[0].value * 1000);
      }
    }

    let diff_in_time = Math.abs(today.getTime() - givenDate.getTime());
    let diff_in_days = diff_in_time / (1000 * 3600 * 24);
    if (!date_in_range(givenDate, today, diff_in_days)) return;

    let details = {
      intent: intent,
      entities: entities,
      unit: unit,
      givenDate: givenDate,
      today: today
    };

    if (is_current_location(entities, len)) { // current location
      navigator.geolocation.getCurrentPosition(function(pos) {
          url = ONECALL_URL.replace('{lat}', pos.coords.latitude);
          url = url.replace('{lon}', pos.coords.longitude);
          url = url.replace('{measurement}', unit[0]);
          url = url.replace('{time}', parseInt(givenDate.getTime() / 1000));

          if (givenDate < today) { // past
            url = url.replace('{forcast}', '/timemachine');
          }
          else { // present & future
            url = url.replace('{forcast}', '');
          }
          fetch(url)
            .then(checkStatus)
            .then(JSON.parse)
            .then(info => {
              return [info, details];
            })
            .then(weather)
            .catch();
      }, error);
    }
    else { // specified location
      let city;
      for (let i = 0; i < len; i++) {
        if (entities[i].type === "builtin.geographyV2.city" || entities[i].type === "Weather.Location") city = entities[i].entity;
      }
      if (lang === "zh-CN") {
        city = await translate(city, 'en');
      }
      url = COORD_URL.replace('{city}', city);
      fetch(url)
        .then(checkStatus)
        .then(JSON.parse)
        .then(info => {
          url = ONECALL_URL.replace('{lat}', info.coord.lat);
          url = url.replace('{lon}', info.coord.lon);
          url = url.replace('{measurement}', unit[0]);
          url = url.replace('{time}', parseInt(givenDate.getTime() / 1000));
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
        .then(info => {
          return [info, details];
        })
        .then(weather)
        .catch();
    }
  }

  /**
   * Prints out the weather condition and output the speech through speaker.
   * @param {Array} infos information about the requested weather
   */
  async function weather(infos) {
    let info = infos[0];
    let details = infos[1];
    let diff_in_time = Math.abs(details.today.getTime() - details.givenDate.getTime());
    let diff_in_days = diff_in_time / (1000 * 3600 * 24);

    let text = "Sorry, I don't understand.";
    if (lang === "zh-CN") text = "对不起，我不明白你的意思。";

    let condition = update_condition(info.current.weather[0].main);

    // Weather value details
    if (details.intent === "Weather.CheckWeatherValue") {
      if (details.givenDate.getDate() === details.today.getDate()) { // present
        text = present_weather(condition, info, details.unit[1]);
      }
      else if (details.givenDate < details.today) { // past
        text = past_weather(condition, info, details.entities, details.unit[1]);
      }
      else { // future
        text = future_weather(info, diff_in_days, details.entities, details.unit[1]);
      }
      synthesize_speech(text);
    }

    // Temperature only
    else if (details.intent === "Weather.ChangeTemperatureUnit") {
      if (details.givenDate.getDate() === details.today.getDate()) { // present
        text = present_temperature(info, details.unit[1]);
      }
      else if (details.givenDate < details.today) { // past
        text = past_temperature(info, details.entities, details.unit[1]);
      }
      else { // future
        text = future_temperature(info, diff_in_days, details.entities, details.unit[1]);
      }
      synthesize_speech(text);
    }

    // Weather Advisory/Alert
    else if (details.intent === "Weather.GetWeatherAdvisory") {
      if (details.givenDate.getDate() === details.today.getDate()) { // present
        text = await present_advisory(info, condition, details.unit[1]);
      }
      else if (details.givenDate > details.today) { // future
        text = await future_advisory(info, diff_in_days, details.entities, details.unit[1]);
      }
      synthesize_speech(text);
      text = modify_text(text, true);
    }
    display_result(text);
  }

  /**
   * Returns present weather condition message.
   * @param {String} condition
   * @param {JSON} info
   * @param {String} unit
   * @returns {String} Respond message
   */
  function present_weather(condition, info, unit) {
    let text;
    if (lang === "en-US") {
      text = "It's ";
      if (condition === "thunderstorm" || (info.current.weather[0].id > 700 && info.current.weather[0].id < 800 && condition !== "foggy")) {
        text = "There's ";
      }
      text += "currently " + condition + " and the temperature is " + info.current.temp + unit + ".\n";
    } else {
      text = "现在" + condition + ", 温度是" + info.current.temp + unit + "。\n";
    }
    return text;
  }

  /**
   * Returns past weather condition message.
   * @param {String} condition
   * @param {JSON} info
   * @param {Array} entities
   * @param {String} unit
   * @returns {String} Respond message
   */
  function past_weather(condition, info, entities, unit) {
    let text;
    if (lang === "en-US") {
      text = "It was ";
      if (condition === "thunderstorm" || (info.current.weather[0].id > 700 && info.current.weather[0].id < 800 && condition !== "foggy")) {
        text = "There was ";
      }
      text += condition + " and the temperature was " + info.current.temp + unit + ".\n";
    } else {
      let duration = entities[entities.length-1].entity.replace(/\s+/g, '');
      text = duration + condition + "，温度是" + info.current.temp + unit + "。\n";
    }
    return text;
  }

  /**
   * Returns future weather condition message.
   * @param {JSON} info
   * @param {int} diff_in_days
   * @param {Array} entities
   * @param {String} unit
   * @returns {String} Respond message
   */
  function future_weather(info, diff_in_days, entities, unit) {
    let text;
    let condition = update_condition(info.daily[Math.round(diff_in_days)].weather[0].main);
    if (lang === "en-US") {
      text = "It's expected to be ";
      if (condition === "thunderstorm" || (info.current.weather[0].id > 700 && info.current.weather[0].id < 800 && condition !== "foggy")) {
        text = "It's expected to have ";
      }
      text += condition + " and the high will be " +
              info.daily[Math.round(diff_in_days)].temp.max + unit + " and the low at " +
              info.daily[Math.round(diff_in_days)].temp.min + ".\n";
    } else {
      let duration = entities[entities.length-1].entity.replace(/\s+/g, '');
      text = duration + condition + "，最高温是" +
              info.daily[Math.round(diff_in_days)].temp.max + unit + "，最低温是" +
              info.daily[Math.round(diff_in_days)].temp.min + ".\n";
    }
    return text;
  }

  /**
   * Returns present temperature message.
   * @param {JSON} info
   * @param {String} unit
   * @returns {String} Respond message
   */
  function present_temperature(info, unit) {
    if (lang === "en-US") {
      return "It's currently " + info.current.temp + unit + ".\n";
    } else {
      return "现在是" + info.current.temp + unit + "。\n";
    }
  }

  /**
   * Returns past temperature message.
   * @param {JSON} info
   * @param {Array} entities
   * @param {String} unit
   * @returns {String} Respond message
   */
  function past_temperature(info, entities, unit) {
    if (lang === "en-US") {
      return "It was " + info.current.temp + unit + ".\n";
    } else {
      let duration = entities[entities.length-1].entity.replace(/\s+/g, '');
      return duration + "是" + info.current.temp + unit + "。\n";
    }
  }

  /**
   * Returns future temperature message.
   * @param {JSON} info
   * @param {int} diff_in_days
   * @param {Array} entities
   * @param {String} unit
   * @returns {String} Respond message
   */
  function future_temperature(info, diff_in_days, entities, unit) {
    if (lang === "en-US") {
      return "The high is expected to be " + info.daily[Math.round(diff_in_days)].temp.max + unit +
                        " and the low at " + info.daily[Math.round(diff_in_days)].temp.min + ".\n";
    } else {
      let duration = entities[entities.length-1].entity.replace(/\s+/g, '');
      return duration + "最高温是" + info.daily[Math.round(diff_in_days)].temp.max + unit +
            "最低温是" + info.daily[Math.round(diff_in_days)].temp.min + "。\n";
    }
  }

  /**
   * Returns present weather advisory/alert message.
   * @param {JSON} info
   * @param {String} condition
   * @param {String} unit
   * @returns {String} Respond message
   */
  async function present_advisory(info, condition, unit) {
    if (info.alerts) {
      let alert = modify_text(info.alerts[0].description, false);
      if (lang === "en-US") return alert;
      return await translate(alert, 'zh-Hans');
    } else {
      if (lang === "en-US") {
        return "I don't have any weather advisory for you right now. "  +
                                      present_weather(condition, info, unit);
      } else {
        return "我现在没有任何天气预警信息。" + present_weather(condition, info, unit);
      }
    }
  }

  /**
   * Returns future weather advisory message.
   * @param {JSON} info
   * @param {int} diff_in_days
   * @param {Array} entities
   * @param {String} unit
   * @returns {String} Respond message
   */
  async function future_advisory(info, diff_in_days, entities, unit) {
    if (info.alerts) {
      if (lang === "en-US") return info.alerts[0].description;
      return await translate(info.alerts[0].description, 'zh-Hans');
    } else {
      if (lang === "en-US") {
        return "I don't have any weather advisory for you right now. " +
                            future_weather(info, diff_in_days, entities, unit);
      } else {
        return "我现在没有任何天气预警信息。" + future_weather(info, diff_in_days, entities, unit);
      }
    }
  }

  /**
   * Updates the temperature measurement and unit.
   * @param {Array} entities
   * @returns {Array} Measurement unit
   */
  function update_unit(entities) {
    for (let i = 0; i < entities.length; i++) {
      if (entities[i].type === "builtin.temperature") {
        if (entities[i].entity === "celsius" || entities[i].entity === "摄氏") {
          return ["metric", "°C"];
        } else if (entities[i].entity === "fahrenheit" || entities[i].entity === "华氏") {
          return ["imperial", "°F"];
        } else {
          return ["standard", "°K"];
        }
      }
    }
    return ["metric", "°C"];
  }

  /**
   * Converts the noun phrase to adjective
   * @param {String} condition The weather condition
   * @returns {String} Weather condition
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
      if (entities[i].type === "builtin.geographyV2.city" || entities[i].type === "Weather.Location") return false;
    }
    return true;
  }

  /**
   * Check if the date requested is in the range
   * @param {String} givenDate
   * @param {String} today
   * @param {int} diff_in_days
   * @returns {Boolean}
   */
  function date_in_range(givenDate, today, diff_in_days) {
    let text;
    if (givenDate < today) { // past
      if (diff_in_days > 5) {
        if (lang === "en-US") {
          text = "Sorry, I can only look back the weather up to 5 days ago.";
        } else {
          text = "对不起，我最多只能查看五天前的天气。"
        }
        synthesize_speech(text);
        display_result(text);
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
        synthesize_speech(text);
        display_result(text);
        return false;
      }
    }
    return true;
  }
  /* ----------------------------- Weather Request End ----------------------------- */


  /* ---------------------------- Home Automation Start ---------------------------- */
  /**
   * Determines which home automation action need to take (i.e. turn on the desk lamp)
   * @param {String} intent
   * @param {JSON} entities
   */
  function home_automation(intent, entities) {
    let device = {
      type: "",
      location: "",
      setting: "",
      all: true
    }

    for (let i = 0; i < entities.length; i++) {
      if (entities[i].type === "HomeAutomation.Location") {
        device.all = false;
        device.location = entities[i].entity;
      }
      if (entities[i].type === "HomeAutomation.DeviceType") device.type = entities[i].entity;
      if (entities[i].type === "HomeAutomation.Setting") device.setting = entities[i].entity;
      if (entities[i].type === "HomeAutomation.Quantifier") device.all = true;
    }

    let text;
    if (intent === "HomeAutomation.TurnOn") {
      text = light_switch(device, "white.jpg", "on");
    }
    else if (intent === "HomeAutomation.TurnOff") {
      text = light_switch(device, "off.jpg", "off");
    }
    else if (intent === "HomeAutomation.SetDevice") {
      if (device.setting === "white" || device.setting === "白色") {
        text = change_light_color(device, "white.jpg");
      } else if (device.setting === "green" || device.setting === "绿色") {
        text = change_light_color(device, "green.jpg");
      }
    }
    synthesize_speech(text);
    display_result(text);
  }

  /**
   * Turns on / off the light
   * @param {Object} device
   * @param {String} src image source ending
   * @param {String} status on/off
   * @returns {String} Respond message
   */
  function light_switch(device, src, status) {
    let text;
    if (device.all) {
      id("lamp-desk").src = "img/desk_" + src;
      id("lamp-floor").src = "img/floor_" + src;
      if (lang === "en-US") {
        text = "Turning " + status + " lights.";
      } else {
        if (status === "on") {
          text = "开灯。";
        } else {
          text = "关灯。";
        }
      }
    }
    else {
      set_image_source(device, src);

      if (lang === "en-US") {
        text = "Turning " + status + " " + device.location + " " + device.type  + ".";
      } else {
        if (status === "on") {
          text = "打开" + device.location;
          if (device.location === "桌上" || device.location === "地上") {
            text += "的";
          }
          text += device.type + "。";
        } else {
          text = "关掉" + device.location;
          if (device.location === "桌上" || device.location === "地上") {
            text += "的";
          }
          text += device.type + "。";
        }
      }
    }
    return text;
  }

  /**
   * Changes the light color (white/green)
   * @param {Object} device
   * @param {String} src Image source ending
   * @returns {String} Respond message
   */
  function change_light_color(device, src) {
    let text;
    if (device.all) {
      id("lamp-desk").src = "img/desk_" + src;
      id("lamp-floor").src = "img/floor_" + src;
      if (lang === "en-US") {
        text = "Changing lights to " + device.setting + ".";
      } else {
        text = "把灯调成" + device.setting + "。";
      }
    }
    else {
      set_image_source(device, src);

      if (lang === "en-US") {
        text = "Changing " + device.location + " " + device.type + " to " + device.setting + ".";
      } else {
        text = "把" + device.location;
        if (device.location === "桌上" || device.location === "地上") {
          text += "的";
        }
        text += device.type + "调成" + device.setting + "。";
      }
    }
    return text;
  }

  /**
   * Sets the images to requested one (light on / light in white, light off, light in green)
   * @param {Object} device
   * @param {String} src Image source ending
   */
  function set_image_source(device, src) {
    if (device.type === "lamp" || device.type === "lamps" || device.type === "light" ||
          device.type === "lights" || device.type === "桌灯" || device.type === "灯" ||
          device.type === "落地灯") {
      if (device.location === "desk" || device.location === "桌" || device.location === "桌上") {
        id("lamp-desk").src = "img/desk_" + src;
      }
      else if (device.location === "floor" || device.location === "落地" || device.location === "地上") {
        id("lamp-floor").src = "img/floor_" + src;
      }
    }
  }
  /* ---------------------------- Home Automation End ------------------------------ */


  /* ----------------------------- Web Search Start -------------------------------- */

  /**
   * Determines the query user is asking for, and return the messages found
   * @param {JSON} entities
   */
  async function web_search(entities) {
    let type;
    let query;
    let builtInUrl;

    let text = "Sorry, I don't understand.";
    if (lang === "zh-CN") text = "对不起，我不明白你的意思。";

    for (let i = 0; i < entities.length; i++) {
      if (entities[i].type === "Web.SearchText" || entities[i].type === "Web.SearchEngine") {
        if (entities[i].entity === "Movie") {
          type = entities[i].entity;
        } else {
          query = entities[i].entity;
        }
      }

      if (entities[i].type === "builtin.url" || entities[i].type === "Web.SearchEngine") {
        builtInUrl =  entities[i].entity;
      }
    }

    let result = await search(query, lang);
    if (builtInUrl) {
      text = direct_to_url(builtInUrl, result);
    }
    else if (query) {
      text = display_query_results(query, result);
    } else {
      display_result(text);
    }
    synthesize_speech(text);
  }

  /**
   * Shows the link to the user and open a new tab to the link requested.
   * @param {String} builtInUrl
   * @param {JSON} result
   * @returns {String} Audio respond
   */
  function direct_to_url(builtInUrl, result) {
    let text;
    let name
    if (lang === "en-US") {
      builtInUrl = result.entities.value[0].url;
      name = result.entities.value[0].name;
    }
    if (!builtInUrl || lang === "zh-CN") {
      builtInUrl = result.webPages.value[0].url;
      name = result.webPages.value[0].name;
    }
    text = "Ok, here's the link to " + name;
    if (lang === "zh-CN") text = "好的，这是" + name + "的链接";
    display_result(text);

    let result_div = document.createElement("div");
    let p = document.createElement("p");
    let a = document.createElement("a");
    result_div.setAttribute("id", "respondDiv");

    a.href = builtInUrl;
    a.innerHTML = builtInUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    p.appendChild(a);
    result_div.appendChild(p);
    id("respondBox").appendChild(result_div);
    id("respondBox").scrollTo(0, id("respondBox").scrollHeight);
    window.open(builtInUrl);
    return text;
  }

  /**
   * Displays the results of the query.
   * @param {String} query
   * @param {JSON} result
   * @returns {String} Audio respond
   */
  function display_query_results(query, result) {
    let text;
    let list;
    if (lang === "en-US") {
      text = "Ok, here's what I found about " + query;
      list = result.entities.value;
    } else {
      text = "好的，这是我搜索到关于" + query + "的信息";
      list = result.webPages.value;
    }
    display_result(text);
    let result_div = document.createElement("div");
    result_div.setAttribute("id", "searches");

    for (let i = 0; i < 3; i++) {
      let name = list[i].name;
      let description;
      let img_url;
      let web_url;
      if (lang === "en-US") {
        description = list[i].description;
        img_url = list[i].image.hostPageUrl;
        web_url = list[i].webSearchUrl;
      } else {
        description = list[i].snippet;
        web_url = list[i].url;
      }
      let div = display_search_result(name, description, img_url, web_url);
      result_div.appendChild(div);
    }
    id("respondBox").appendChild(result_div);
    id("respondBox").scrollTo(0, id("respondBox").scrollHeight);
    return text;
  }

  /**
   * Build the information block that includes image and description.
   * @param {String} name
   * @param {String} text description of searched info
   * @param {String} image
   * @param {String} url
   * @returns {Object} Whole tag of searched info
   */
  function display_search_result(name, text, image, url) {
    let div = document.createElement("div");
    div.setAttribute("id", "searchRespond");

    let text_div = document.createElement("div");
    text_div.setAttribute("class", "text");

    if (lang === "en-US") {
      let img_div = document.createElement("div");
      let img = document.createElement("img");
      img.src = image;
      img_div.setAttribute("class", "imgs");
      img_div.appendChild(img);
      div.appendChild(img_div);
    }

    let a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("style", "text-decoration: none; color: black");

    let h3 = document.createElement("h3");
    let p = document.createElement("p");
    h3.innerHTML = name;
    p.innerHTML = text;
    text_div.appendChild(h3);
    text_div.appendChild(p);

    div.appendChild(text_div);
    a.appendChild(div);
    return a;
  }

  /**
   * Fetch the information of the query.
   * @param {String} query Information needs to be searched
   * @returns {JSON}
   */
  async function search(query, lang) {
    try {
      let body = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${query}&mkt=${lang}&count=10&offset=0`,
      {
        method: "GET",
        headers: {
          'Ocp-Apim-Subscription-Key': searchKey,
          'Content-type': 'application/json'
        },
      })
        .then(r => r.json());

      return body;
    }
    catch( err ) {
      return console.log( "Error in translation request", err );
    }
  }

  /* ------------------------------ Web Search End --------------------------------- */


  /**
   * Converts the returning text message into audio output to play out through the speaker.
   * Displays the returning text message in the respond block.
   * @param {String} text Output text
   */
  function synthesize_speech(text) {
    synthesizer.speakTextAsync(text,
      function(result) {
        synthesizer.close();
        return result.audioData;
      },
      function(error) {
        console.log(error);
        synthesizer.close();
      });
  }

  /**
   * Displays the result message on the screen.
   * @param {String} text
   */
  function display_result(text) {
    let div = document.createElement("div");
    let p = document.createElement("p");
    div.setAttribute("id", "respondDiv");
    p.innerHTML = text;
    div.appendChild(p);
    id("respondBox").appendChild(div);
    id("respondBox").scrollTo(0, id("respondBox").scrollHeight);
  }

  /**
   * Stops the continuous speech recognition.
   * @param {SpeechSDK} recognizer
   */
  function stop_recognition(recognizer) {
    id("ch").disabled = false;
    id("en").disabled = false;
    id("mic").classList.remove("hidden");
    id("record").classList.add("hidden");
    id("btn-txt").classList.remove("hidden");
    recognizer.stopContinuousRecognitionAsync();
  }

  /**
   * Modifies the text for easier readibility.
   * If `breaks` is false, modify the text for speech synthesys. It will set to
   * true after speech synthesys for better visual presentation.
   * @param {String} text
   * @param {Boolean} breaks
   * @returns {String}
   */
  function modify_text(text, breaks) {
    let arr;
    if (!breaks) {
      arr = text.split("*");
      arr[0] = arr[0].substring(3);
      for (let i = 0; i < 2; i++) {
        arr[i] = arr[i].replace(arr[i].substring(arr[i].search("\n"), arr[i].search("\n")+1), " ");
      }
      for (let i = 0; i < arr.length; i++) {
        arr[i] = arr[i].replace("...", "\n");
      }
      arr[arr.length - 1] = arr[arr.length - 1].replace("\n", " ");
    } else {
      arr = text.split("\n");
    }

    let alert = "";
    for (let i = 0; i < arr.length - 1; i++) {
      alert += arr[i];
      if (breaks) alert += "<br>";
    }
    return alert;
  }

  /**
   * Translates the message passed in to the given language
   * @param {String} message
   * @param {String} language
   * @returns {String} translated message
   */
  async function translate(message, language) {
    try {
      let body = await fetch(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${language}`,
      {
        method: "POST",
        headers: {
          'Ocp-Apim-Subscription-Key': translatorKey,
          'Ocp-Apim-Subscription-Region': translatorRegion,
          'Content-type': 'application/json',
          'X-ClientTraceId': uuidv4().toString()
        },
        body: JSON.stringify([
        {
          'text': message
        }]),
      })
        .then(r => r.json());

      return body[0].translations[0].text;
    }
    catch( err ) {
      return console.log( "Error in translation request", err );
    }
  }

  /**
   * Generates Unisersally Unique Identifier
   * @returns {String}
   */
  function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }




  /* ------------------------------ Helper Functions  ------------------------------ */

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
