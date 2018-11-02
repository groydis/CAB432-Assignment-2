var express = require('express');
var analyzer = require('natural').SentimentAnalyzer;
var stemmer = require('natural').PorterStemmer;
var nlp = require('compromise');

var Tweet = require('../models/tweet.model');
var Trend = require('../models/trend.model');
var router = express.Router();

var sentimentAnalyzer = new analyzer("English", stemmer, "afinn");

async function getTrends() {
  return new Promise((resolve, reject) => {
    let trends = [];
    Trend.find({}, { _id: 0, tag: 1 }).then(results =>
    {
      for (let i = 0; i < results.length; i++) {
        trends[i] = results[i].tag;
      }
      resolve(trends);
    })
    .catch(error => {
      resolve(error);
    });
  });
};

async function getTag(trends, tweet) {
  return new Promise((resolve, reject) => {
    let tweetTag = [];
    for (let i = 0; i < trends.length; i++) {
      let string = trends[i];
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

async function processSentiment(tweet) {
  return new Promise((resolve) => {
    var doc = nlp(tweet).normalize().out('text');
    var splitTweet = doc.split(' ');
    let sentiment = sentimentAnalyzer.getSentiment(splitTweet);
    resolve(sentiment);
  });
};

async  function handleTweets(body) {
  return new Promise((resolve) => {
    let tweet = body;
    let tweetMessage = '';
    if (tweet != undefined) { 
      if (tweet.extended_tweet) { 
        tweetMessage = tweet.extended_tweet.full_text;
      } else {
        if(tweet.retweeted_status) { 
          tweetMessage = tweet.retweeted_status.text;
        } else {
          tweetMessage = tweet.text;
        }
      }
    }
    resolve(tweetMessage);
  });
};

/* GET home page. */
router.get('/', function(req, res, next) {
  console.log('Hey good looking!');
});

router.post('/', function (req, res) {
  handleTweets(req.body).then(tweet => {
    getTrends().then(results => {
      getTag(results, tweet).then(tag => {
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
      .catch(error => {
        console.log(error);
      });
    })
    .catch(error => {
      console.log("Error Recieving Trends: " + error)
    });
  });
});

router.post('/trends', function (req, res) {
  let trends = req.body.trends;
  for (let i = 0; i < trends.length; i++) {
    Trend.find({tag : trends[i]}, function (err, docs) {
      if (docs.length){
          console.log('Trend Already Exists: ' + trends[i]);
      } else {
        let t = new Trend();
        t.tag = trends[i];
        t.save(function(err) {
          if (err) {
            console.log('Error Saving Trend: ', err);
          } else {
            console.log('Trend: ' + trends[i]);
          }
        });
      }
    });
  }
  res.sendStatus(200);
});


module.exports = router;
