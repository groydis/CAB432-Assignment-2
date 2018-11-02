var express = require('express');
var twitter = require('twitter');
var analyzer = require('natural').SentimentAnalyzer;
var stemmer = require('natural').PorterStemmer;
var nlp = require('compromise');

var sentimentAnalyzer = new analyzer("English", stemmer, "afinn");

var TwitterHandler = require('../scripts/twitterhandler');
var Tweet = require('../models/tweet.model');

var router = express.Router();

const config = require('../config.js');

const client = new twitter({
  consumer_key: config.twitter.consumer.key,
  consumer_secret: config.twitter.consumer.secret,
  access_token_key: config.twitter.access.key,
  access_token_secret: config.twitter.access.secret
});
//sentimentAnalyzer.getSentiment(splitTweet)


let tweets = [];
let query;

/* GET home page. */
router.get('/', function(req, res, next) {
  query = req.param('q');
  let pushTweets = [['Tag','Sentiment']];

  if (!query) {
    console.log('No query!');
  } else {
    Tweet.aggregate([
      { $match: { tag: query }},
      { $group: { _id: "$tag", avg: { $avg: "$sentiment"}}}
      ], (err, resultsTweets) => {
        if(!err) {
          resultsTweets.map((result) => 
            pushTweets.push([result._id, result.avg]));
          console.log(pushTweets);
        } else {
          console.log(err);
        }
    });
  }

  TwitterHandler.trends('23424748').then(function(data) {
    res.render('index', { title: 'TweetStorm', trending: data, graphData: pushTweets});
  }).catch((error) => {
      res.render('error', { message: 'An error occured retriving trends!', error: error });
  });
});

router.get('/trends', function(req, res, next) {
  TwitterHandler.trends('23424748').then(function(data) {
    res.json(data);
  }).catch((error) => {
      res.render('error', { message: 'An error occured retriving trends!', error: error });
  });
});

router.get('/results', function(req, res) {
/*
  client.stream('statuses/filter', {track: query },  function(stream) {
    stream.on('data', function(tweet) {
      let tweetMessage;
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
      console.log(tweetMessage);
      var doc = nlp(tweetMessage).normalize().out('text');
      var splitTweet = doc.split(' ');
      let result = {
        message: tweetMessage,
        sentiment: sentimentAnalyzer.getSentiment(splitTweet),
      }
      let t = new Tweet();
      t.tag = query;
      t.tweet = result.message;
      t.sentiment = result.sentiment;
      t.save(function(err) {
        if (err) console.log('error2: ', err);
      });
      tweets.push(result);
      res.json(tweets);
    });

    stream.on('error', function(error) {
      console.log(error);
    });
  });
*/
});

module.exports = router;
