var express = require('express');
var request = require('request');
var router = express.Router();

var Trend = require('../models/trend.model');
var Tweet = require('../models/tweet.model');

function getTrends() {
  return new Promise((resolve, reject) => {
    let trends = [];
    Trend.find({}, { _id: 0, tag: 1 }).then(results =>
    {
      for (let i = 0; i < results.length; i++) {
        trends[i] = results[i].tag;
      }
      console.log(trends);
      resolve(trends);
    })
    .catch(error => {
      resolve(error);
    });
  });
};

async function aggregateTweets(query) {
  return new Promise((resolve, reject) => {
    let tweets = [['Tag', 'Sentiment']];  
    let proms = [];
    const promisesToAwait = [];
  
    Tweet.aggregate([
      { $group: { _id: '$tag', avg: {$avg: '$sentiment' }}}
      ], (err, tweetResults) => {
        if (!err) {
          tweetResults.map((result) => tweets.push([result._id, result.avg]));
          resolve(tweets);
        } else {
          res.render('error', { message: 'Oops! There was an issue with a query.', error: err });
        }
      })
  });
}

let trends = [];
/* GET home page. */
router.get('/', function(req, res, next) {
  request({
    url: 'http://localhost:3001/',
    method: 'POST',
  }, function (err, res, body) {
    if (!err) {
      console.log('Stream Response: ' + res);
    } else {
      console.log('Unable to connect to server!');
    }
  });
  getTrends().then(result => {
    let query = result;
    trends = query;
    aggregateTweets(query).then(tweets => {
      res.render('index', { tweets: JSON.stringify(tweets), trending: trends});
    });
  });
});

router.get('/stats', function(req, res, next) {
  let trackingTrends = req.query.tags.split(',');
  console.log('Stats: ' + trackingTrends);
  //let data = [['Time', 'Tag', 'Sentiment']];
  let data = [];
  let pushData = [];
  
  Tweet.aggregate([
    { $match: {"tag": { "$in": trackingTrends }}},
    { $group: { _id: '$tag', avg: {$avg: '$sentiment' }}}
    ], (err, tweetResults) => {
      if (!err) {
        tweetResults.map((result) => 
        data.push({'time': new Date().toLocaleTimeString(), 'tag': result._id, 'sentiment': result.avg }));
        console.log(data);
        res.json(data);
      } else {
        console.log(err);
        res.render('error', { message: 'Oops! There was an issue with a query.', error: err });
      }
    })
});

router.post('/', function(req, res, next) {
  let query = req.body.q.split(',');
  query.splice( query.indexOf(' '), 1 );
  console.log('Post Query: ' + query);
  request({
    url: 'http://localhost:3001/stop',
    method: 'POST',
  }, function (err, res, body) {
    if (!err) {
      console.log('Stream STOP Response: ' + res);
    } else {
      console.log('Unable to connect to server!');
    }
  });
  
  request({
    url: 'http://localhost:3001/start',
    method: 'POST',
    json: query
  }, function (err, res, body) {
    if (!err) {
      console.log('Stream START Response: ' + res);
    } else {
      console.log('Unable to connect to server!');
    }
  });
  aggregateTweets(query).then(tweets => {
    res.render('index', { tweets: JSON.stringify(tweets), trending: trends, query: query });
  });
});

module.exports = router;
