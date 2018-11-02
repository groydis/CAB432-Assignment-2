var express = require('express');
var analyzer = require('natural').SentimentAnalyzer;
var stemmer = require('natural').PorterStemmer;
var nlp = require('compromise');


var router = express.Router();

var sentimentAnalyzer = new analyzer("English", stemmer, "afinn");


var Tweet = require('../models/tweet.model');
var Trend = require('../models/trend.model');


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
      console.log(tweet);
      reject("No tag found, moving on");
    }
  });
};

async function processSentiment(tweet) {
  return new Promise((resolve) => {
    var doc = nlp(tweet).normalize().out('text');
    var splitTweet = doc.split(' ');
    let sentiment = sentimentAnalyzer.getSentiment(splitTweet);
    resolve(sentiment);
  });
};


let tracking = [];

router.post('/tweet', function(req, res, next) {
	let tweet = req.body.tweet;
  getTag(trends, tweet).then(tag => {
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

module.exports = router;
