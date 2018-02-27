// App ID: AKfycbx0ZvWRmywv0ApYlkh7UUi9Ly2XFp9FhuecLfIU_Tev

var MAX_THREADS = 5;
var _ = LodashGS.load();
var THREAD_COUNT = 2.0;
var BACKEND_URL = "http://testing.cleanboxapp.com/cleanbox";

/**
 * Returns the array of cards that should be rendered for the current
 * e-mail thread. The name of this function is specified in the
 * manifest 'onTriggerFunction' field, indicating that this function
 * runs every time the add-on is started.
 *
 * @param {Object} e data provided by the Gmail UI.
 * @returns {Card[]}
 */
function buildAddOn(e) {
  // Activate temporary Gmail add-on scopes.
  var accessToken = e.messageMetadata.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var messageId = e.messageMetadata.messageId;
  var senderData = extractSenderData(messageId);
  var cards = [];

  // Build a card for each recent thread from this email's sender.
  if (senderData.recents.length > 0) {
    senderData.recents.forEach(function(threadData) {
      cards.push(buildRecentThreadCard(senderData.email, threadData));
    });
  } else {
    // Present a blank card if there are no recent threads from
    // this sender.
    cards.push(CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
        .setTitle('No recent threads from this sender')).build());
  }
  
  return cards;
}

function _buildAddOn(e) {
  _callVendorServer();
  var unreadMailThreads = GmailApp.search('in:unread', 0, 200);
  var unreadEmails = [];
  
  unreadMailThreads.forEach(function(thread) {
    unreadEmails.push(extractEmailAddress(thread.getMessages()[0].getFrom()));
    //from = extractEmailAddress(from);
    //Logger.log(from);
    //unreadEmails.push(from);
  });
  
  //Logger.log(unreadEmails);
  var obj = {};
  var arr = [];
  
  for(i = 0; i < unreadEmails.length; i++) {
    if(_.findIndex(arr, { 'email': unreadEmails[i] }) != -1) {
      // obj[unreadEmails[i]] = obj[unreadEmails[i]] + 1;
      
      var index = _.findIndex(arr, { 'email': unreadEmails[i] });
      arr[index] = {
        email: unreadEmails[i],
        count: arr[index]['count'] + 1
      };
      
      //arr.push({
        //email: unreadEmails[i],
        //count: arr[unreadEmails[i]] + 1
      //});
    } else {
      arr.push({
        email: unreadEmails[i],
        count: 1
      });
    }
  }
  
  arr = _.orderBy(arr, ['count'], ['desc']);
  
  arr = arr.filter(function(el) {
    return el.count >= THREAD_COUNT;
  });
  
  var finalArr = [];
  
  arr.forEach(function(arrObj) {
    var threads = GmailApp.search('in:unread from:' + arrObj.email, 0, 1);
    //Logger.log(arrObj.email);
    threads.forEach(function(thread) {
      var res = thread.getMessages()[0].getRawContent();
      var originalFrom = thread.getMessages()[0].getFrom();
      var transformedFrom = extractEmailAddress(originalFrom);
      
      var unsubLink = _getUnsubscribeLink(res);
      if(unsubLink) {
        finalArr.push({
          from: _.replace(originalFrom, ' <' + transformedFrom + '>', ''),
          email: transformedFrom,
          messageObj: thread.getMessages()[0].getId(),
          link: BACKEND_URL + "?unsub=" + unsubLink,
          count: arrObj.count
        });
      }
      //Logger.log(unsubLink);
    });
  });
  
  var cardSection = CardService.newCardSection();
  
  var txtPara = [];
  
  for(i = 0; i < finalArr.length; i++) {
    if(i <= 49) {
      var textStr = '<b>' + finalArr[i]['from'] + '</b>' + ' (' + finalArr[i]['count'] + ')' + ' - ' + '<i>' + finalArr[i]['email'] + '</i>';
      cardSection.addWidget(_generateTextPara(textStr));
      cardSection.addWidget(
        CardService.newButtonSet().addButton(
          CardService.newTextButton()
          .setText('Unsubscribe')
          .setOnClickAction(CardService.newAction().setFunctionName('_onUnsubscribe').setParameters({
            email: finalArr[i]['email'],
            link: finalArr[i]['link']
          }))
          
        ));
    }
  }
  
  var card = CardService.newCardBuilder()
     .setName("Card name")
     .setHeader(CardService.newCardHeader().setTitle("List of non-relevant Emails"))
     .addSection(cardSection)
     .build();
  
  return card;
}

function _getUnsubscribeLink(body) {
  var regex = /List-Unsubscribe:\s{1}<{1}([\w%:\?\.\d-=@\/]{1,})>{1}/;
  var email = null;
  // var email = sender;  // Default to using the whole string.
  var match = regex.exec(body);
  //Logger.log(match);
  if (match) {
    email = match[1];
  }
  //Logger.log('------------->' + email);
  return email;
}

function _onUnsubscribe(parameters) {
  var email = parameters['parameters']['email'];
  var link = parameters['parameters']['link'];
  Logger.log(email + " - " + link);
  
  // Removing the non-relevant emails
  var threads = GmailApp.search('in:unread from:' + email);
  threads.forEach(function(thread) {
    // GmailApp.moveThreadToTrash(thread);
    thread.getMessages().forEach(function(message) {
      GmailApp.getMessageById(message.getId()).moveToTrash();
    });
  });
  
  return CardService.newActionResponseBuilder()
     .setOpenLink(CardService.newOpenLink()
         .setUrl(link)
         .setOpenAs(CardService.OpenAs.FULL_SIZE)
         .setOnClose(CardService.OnClose.NOTHING)).build();
  
}

function justTry() {
  
  // Removing the non-relevant emails
  var threads = GmailApp.search('in:unread from:' + 'noreply@way2sms.in');
  threads.forEach(function(thread) {
    // GmailApp.moveThreadToTrash(thread);
    thread.getMessages().forEach(function(message) {
      Logger.log(message.getId());
      GmailApp.getMessageById(message.getId()).moveToTrash();
    });
  });
  CardService.newOpenLink().setUrl('http://google.com/').setOpenAs(CardService.OpenAs.FULL_SIZE);
}

function _callVendorServer() {
  var method = 'get';
  var headers = {};
  var url = BACKEND_URL + '/users?email=' + Session.getActiveUser().getEmail();
  
  var response = UrlFetchApp.fetch(url);
  Logger.log(url + '  --  ' + response.getContentText());
}

function _generateTextPara(email) {
  return CardService.newTextParagraph().setText(email);
}

/**
 *  This function builds a set of data about this sender's presence in your
 *  inbox.
 *
 *  @param {String} messageId The message ID of the open message.
 *  @return {Object} a collection of sender information to display in cards.
 */
function extractSenderData(messageId) {
  // Use the Gmail service to access information about this message.
  var mail = GmailApp.getMessageById(messageId);
  var threadId = mail.getThread().getId();
  var senderEmail = extractEmailAddress(mail.getFrom());

  var recentThreads = GmailApp.search('from:' + senderEmail);
  var recents = [];

  // Retrieve information about up to 5 recent threads from the same sender.
  recentThreads.slice(0,MAX_THREADS).forEach(function(thread) {
    if (thread.getId() != threadId && ! thread.isInChats()) {
      recents.push({
        'subject': thread.getFirstMessageSubject(),
        'count': thread.getMessageCount(),
        'link': 'https://mail.google.com/mail/u/0/#inbox/' + thread.getId(),
        'lastDate': thread.getLastMessageDate().toDateString()
      });
    }
  });

  var senderData = {
    "email": senderEmail,
    'recents': recents
  };

  return senderData;
}

/**
 *  Given the result of GmailMessage.getFrom(), extract only the email address.
 *  getFrom() can return just the email address or a string in the form
 *  "Name <myemail@domain>".
 *
 *  @param {String} sender The results returned from getFrom().
 *  @return {String} Only the email address.
 */
function extractEmailAddress(sender) {
  var regex = /\<([^\@]+\@[^\>]+)\>/;
  var email = sender;  // Default to using the whole string.
  var match = regex.exec(sender);
  if (match) {
    email = match[1];
  }
  //Logger.log('------------->' + email);
  return email;
}

/**
 *  Builds a card to display information about a recent thread from this sender.
 *
 *  @param {String} senderEmail The sender email.
 *  @param {Object} threadData Infomation about the thread to display.
 *  @return {Card} a card that displays thread information.
 */
function buildRecentThreadCard(senderEmail, threadData) {
  var card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader().setTitle(threadData.subject));
  var section = CardService.newCardSection()
    .setHeader("<font color=\"#1257e0\">Recent thread</font>");
  section.addWidget(CardService.newTextParagraph().setText(threadData.subject));
  section.addWidget(CardService.newKeyValue()
    .setTopLabel('Sender')
    .setContent(senderEmail));
  section.addWidget(CardService.newKeyValue()
    .setTopLabel('Number of messages')
    .setContent(threadData.count.toString()));
  section.addWidget(CardService.newKeyValue()
    .setTopLabel('Last updated')
    .setContent(threadData.lastDate.toString()));

  var threadLink = CardService.newOpenLink()
    .setUrl(threadData.link)
    .setOpenAs(CardService.OpenAs.FULL_SIZE);
  var button = CardService.newTextButton()
    .setText('Open Thread')
    .setOpenLink(threadLink);
  section.addWidget(CardService.newButtonSet().addButton(button));

  card.addSection(section);
  return card.build();
}