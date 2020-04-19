const mail = PropertiesService.getScriptProperties().getProperty('DEVELOPER_MAIL')
const token = PropertiesService.getScriptProperties().getProperty('VERIFY_TOKEN')
function test() {
  let index = seachWord('椅子')
  console.log(index)
}

function doPost(e){
  try {
      //verify(e)
    //MailApp.sendEmail(mail, 'メール', 'check OK')

    // First request
    if (e.parameter.payload === undefined) {
      //MailApp.sendEmail(mail, '初回', e.postData.getDataAsString())
      var data = JSON.parse(e.postData.getDataAsString())
      if (data.token != token) {
        return
      }
      let word = data.event.blocks[0].elements[0].elements[1].text.trim()
      let user = data.event.user
      responseExplain(word, user)
      return
    }

    // After user action 
    let payload = JSON.parse(e["parameter"]["payload"])
    let callback_id = payload["callback_id"]
    let trigger_id = payload["trigger_id"]
    if (payload.token != token) {
      return
    }
    //MailApp.sendEmail(mail, 'ボタン', JSON.stringify(payload))
    // If User submit button
    if (callback_id === 'ButtonResponse') {
      let name = payload["actions"][0]["name"]
      let value = payload["actions"][0]["value"]
      

      if (name === "edit") {
        new postDialog(trigger_id, value)
        return ContentService.createTextOutput()
      }
    }

    // IF User submit dialog form
    if (callback_id === 'dialog') {
      //MailApp.sendEmail(mail, 'ダイアログ送信受け取り', JSON.stringify(payload))//"name:"+name+", value:"+value)
      let explain = payload.submission.explain.trim()
      if (!explain) {
        return
      }
      let word = payload.state
      setExplain(word, explain)
      rep = {text: "ありがとう、説明を更新したYO！\n「"+ explain+"」"}
      sendSlack(rep)
      return ContentService.createTextOutput()
    }
    
  } catch(err) {
    MailApp.sendEmail(mail, 'ERROR', err)
  }
}

// Controller 
function responseExplain(word, user) {
  let explain = seachWord(word)

  let attachments = [{
    "fallback": "Sorry, no support for buttons.",
    "callback_id": "ButtonResponse",
    "color": "#3AA3E3",
    "attachment_type": "default",
    "actions": [
      {
        "name": "edit",
        "text": "ここで編集する",
        "style": "danger",
        "type": "button",
        "value": word
      }
    ]
  }];
  let payload
  let link = "\n\nスプレットシートでも編集できます\nhttps://docs.google.com/spreadsheets/d/"+PropertiesService.getScriptProperties().getProperty('SHEET_ID')+"/edit#gid=0"
  if (explain == null) {
    payload = {
      "attachments": attachments,
      "text": "<@"+user+"> " + "「" + word + "」はまだ登録されていません。\nあなたが書いてみませんか？"+link
    }
  } else {
    payload = {
      "attachments": attachments,
      "text": "<@"+user+"> " + word + "\n" + explain +　link
    }
  }
    //MailApp.sendEmail(mail, 'responseExplain', word)
  sendSlack(payload)
}

function sendSlack(payload) {
  var url = PropertiesService.getScriptProperties().getProperty('SLACK_INCOMING_WEBHOOK')
  var options =
   {
     "method" : "post",
     "contentType" : "application/json",
     "payload" : JSON.stringify(payload)
   };
  return UrlFetchApp.fetch(url, options);
}

function verify(e) {
  try {
    var json = JSON.parse(e.postData.getDataAsString());
    if (json.type == "url_verification" && json.token == token) {
      return ContentService.createTextOutput(json.challenge);
    }
  } catch (ex) {
  }
}

/**
 * ダイアログをpostする
 */
function postDialog(trigger_id, word) {
  let explain = seachWord(word)
  var slackUrl = "https://hogehoge.slack.com/api/dialog.open";
  var SLACK_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('SLACK_ACCESS_TOKEN');
  var dialog = {
    "token": SLACK_ACCESS_TOKEN,//OAuth token
    "trigger_id": trigger_id,
    "dialog": JSON.stringify({
      "state": word,
      "callback_id": "dialog",
      "title": word + "の説明",
      "submit_label": "決定",
      "elements": [
        {
          "type": "textarea",
          "label": word + "とは",
          "name": "explain",
          "value": explain
        }
      ]
    })
  };
  var options = {
    'method' : 'post',
    'payload' : dialog,
  }; 
  UrlFetchApp.fetch(slackUrl, options);

  return ContentService.createTextOutput(); // Important
}

function getSheet() {
  let sheet_id = PropertiesService.getScriptProperties().getProperty('SHEET_ID')
  var spreadsheet = SpreadsheetApp.openById(sheet_id);
  return spreadsheet.getActiveSheet();
}
function getWordData() {
  let sheet = getSheet()
  return values = sheet.getRange('A2:B10').getValues();
}
function seachWord(word) {
  var values = getWordData();
  for (var i = 0, len = values.length; i < len; ++i) {
    let registerdWord = values[i][0]
    if (registerdWord === '') {
      break
    }
    if (registerdWord === word) {
      return values[i][1]
    }
  }
  return null
}
function setExplain(word, explain) {
  let offset = 2
  let sheet = getSheet()
  let values = sheet.getRange('A2:B10').getValues();
  for (var i = 0, len = values.length; i < len; ++i) {
    let registerdWord = values[i][0]
    // hitなし
    if (registerdWord === '') {
      sheet.getRange(i+offset, 1).setValue(word);
      sheet.getRange(i+offset, 2).setValue(explain);
      break
    }
    if (registerdWord === word) {
      sheet.getRange(i+offset, 2).setValue(explain);
      break
    }
  }
}

