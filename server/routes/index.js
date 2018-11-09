var express = require('express');
var analyzer = require('natural').SentimentAnalyzer;
var stemmer = require('natural').PorterStemmer;
var pos = require('pos');
var nlp = require('compromise');


var router = express.Router();

var sentimentAnalyzer = new analyzer("English", stemmer, "afinn");

// Models
var Tweet = require('../models/tweet.model');
var Trend = require('../models/trend.model');
var Words = require('../models/words.model');

// Used for finding nouse
// Loops through sentnece and builds and array full of nouns
function wordsWordsWords(tweet) {
  let allWords = [];
  var words = new pos.Lexer().lex(tweet);
  var tagger = new pos.Tagger();
  var taggedWords = tagger.tag(words);

  taggedWords.forEach(function(word) {
    const wordTypes = ["NNP", "NNPS", "NNS"];
    if (wordTypes.indexOf(word[1]) !== -1) {
      if (word[0].length > 2) {
          allWords.push(word[0]);
      }
    }
  });
  return allWords;
}

// Loops through a given tweet and determines if a trending topic is assciated with it
// If no topic found, disregards tweet.
async function getTag(trends, tweet) {
  return new Promise((resolve, reject) => {
    let tweetTag = [];
    for (let i = 0; i < tracking.length; i++) {
      let string = tracking[i];
      stringsearch = new RegExp(string, 'i');
      if (stringsearch.test(tweet)) {
        tweetTag.push(string);
      }
    }
    if (tweetTag.length > 0) {
      resolve(tweetTag);
    } else {
      reject("No tag found, moving on");
    }
  });
};

// Process the sentimental value of the passed in tweet
async function processSentiment(tweet) {
  return new Promise((resolve) => {
    var doc = nlp(tweet).normalize().out('text');
    var splitTweet = doc.split(' ');
    let sentiment = sentimentAnalyzer.getSentiment(splitTweet);
    resolve(sentiment);
  });
};

// Does a quick check to see if the tags passed in are already listed in the main tags array
// If not adds to main array, this helps ensure when looking for a custom search topic that it 
// Can associate it with a tag
async function checkTags(newTags) {
  return new Promise(() => {
    let sentTags = newTags.split(',');
    for (let i = 0; i < sentTags.length; i++) {
      if (!tracking.includes(sentTags[i])) {
        tracking.push(sentTags[i]);
      } 
    }
  });
};

let tracking = [];

// Health Check - Used by load balancer
router.get('/', function(req, res, next) {
  console.log("That tickles... HEALTH CHECK!");
  res.sendStatus(200);
});

// Handles In coming data from the Twitter Stream Server 
router.post('/tweet', function(req, res, next) {
  // Grab reqeust and check if tag provided with tweet body is the list of trending topics
	let tweet = req.body.tweet;
  let sentTags = req.body.tags.split(',');
  for (let i = 0; i < sentTags.length; i++) {
    if (sentTags[i].length != 0) {
      if (!tracking.includes(sentTags[i])) {
        tracking.push(sentTags[i]);
        console.log('Added: ' + sentTags[i])
      } 
    }
  }
  // Associate a tag with the body
  getTag(trends, tweet).then(tag => {
    // Grab the nouns and store in database -- ThIS IS UNUSED
      let nouns = wordsWordsWords(tweet);
      for (let i = 0; i < nouns.length; i++) {
        Words.find({ "tag": tag, "word": nouns[i]}, function(err, result) {
          if (result.length) {
            console.log("Word Exists Under Tag:" + tag + " | " + nouns[i]);
          } else {
            let w = new Words();
            w.tag = tag;
            w.word = nouns[i];
            w.save(function(err) {
              if (err) {
                console.log('Save to DB error: ', err);
              } else {
                console.log('tag:' + tag);
                console.log('noun:' + nouns[i]);
              }
            });
          }
        });
      }
      // Grab teh sentiment and store in database 
    processSentiment(tweet).then(sentiment => {
      let t = new Tweet();
      t.tag = tag;
      t.tweet = tweet;
      t.sentiment = sentiment;
      t.save(function(err) {
        if (err) {
          console.log('Save to DB error: ', err);
        } else {
          console.log('tag:' + tag);
          console.log('tweet: ' + tweet);
          console.log('sentiment: ' + sentiment);
        }
      });
    });
  })
  .catch(function(error){
    console.log('Tag error: ' + error)
  });
  res.sendStatus(200);
});

// Handles Trends from the tweet stream server
// Storing them in the database when the come in
router.post('/trends', function(req, res, next) {
  trends = req.body;
  console.log(trends);
  Trend.remove().exec();
  for (var i = 0; i < trends.length; i++) {
    tracking[i] = trends[i].name;
    let tag = trends[i].name;
    let t = new Trend();
    t.tag = tag;
    t.save(function(err) {
      if (err) {
        console.log('Error Saving Trend: ', err);
      } else {
        console.log('Saved Tag: ' + tag);
      }
    });
  }
  res.sendStatus(200);
});

// Used for retrieving nouns from the clinet -- UNUSED
router.get('/words', function(req, res, next) {
  let trackingTrends = req.query.tag.split(',');
  console.log(trackingTrends);
  let data = [];
  
  Words.aggregate([
    { $match: {"tag": { "$in": trackingTrends }}},
    { $group: { _id: '$word', sum: { $sum: 1 }}}
    ], (err, tweetResults) => {
      if (!err) {
        tweetResults.map((result) => 
        data.push({ 'word': result._id, 'count': result.sum }));
        console.log("WORD DATA: " + data);
        res.json(data);
      } else {
        console.log(err);
        res.render('error', { message: 'Oops! There was an issue with a query.', error: err });
      }
    });
})

// Client makes a request to this entry point and it returns the queried trends and average sentiment value
router.get('/stats', function(req, res, next) {
  let trackingTrends = req.query.tags.split(',');
  console.log("GOT A HIT!!");
  let data = [];
  
  Tweet.aggregate([
    { $match: {"tag": { "$in": trackingTrends }}},
    { $group: { _id: '$tag', avg: {$avg: '$sentiment' }}}
    ], (err, tweetResults) => {
      if (!err) {
        tweetResults.map((result) => 
        data.push({ 'tag': result._id, 'sentiment': result.avg }));
        data.forEach( function(element, index) {
          console.log('STAT DATA: ' + element);
        });
        //console.log('STAT DATA: ' + data);
        res.json(data);
      } else {
        console.log(err);
        res.render('error', { message: 'Oops! There was an issue with a query.', error: err });
      }
    });
});

module.exports = router;
