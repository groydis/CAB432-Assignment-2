var express = require('express');
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

  getTrends().then(result => {
    let query = result;
    trends = query;
    aggregateTweets(query).then(tweets => {
      res.render('index', { tweets: JSON.stringify(tweets), trending: query });
    });
  });
});

router.post('/', function(req, res, next) {
  let query = req.body.q.split(',');
  query.splice( query.indexOf(' '), 1 );
  console.log(query);

  if (query == '') {
    res.render('error', { message: "No query entered, please use a query. eg 'Trump'", error: query});
  }

  aggregateTweets(query).then(tweets => {
      res.render('index', { tweets: JSON.stringify(tweets), trending: trends, query: query });
  });
});

module.exports = router;
