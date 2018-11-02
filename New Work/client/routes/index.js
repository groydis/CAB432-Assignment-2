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


/* GET home page. */
router.get('/', function(req, res, next) {
	let tags = req.query.tags;
	// Check if query - else we will just run a static page
	getTrends().then(result => {
		if (tags) {
      request({
        url: 'http://localhost:3002/stream',
        method: 'POST',
        form: {tags: tags}
      }, function (err, res, body) {
        if (!err) {
          console.log('Stream STOP Response: ' + res);
        } else {
          console.log('Unable to connect to server!');
        }
      });
			res.render('index', { title: tags, tags:  result, tracking: tags });
		} else { 
			res.render('index', { title: "Select #hashtag's to begin", tags: result, tracking: 'none' });
		}
	});
});

router.get('/stats', function(req, res, next) {
  let trackingTrends = req.query.tags.split(',');
  console.log('Stats: ' + trackingTrends);
  let data = [];
  let pushData = [];
  
  Tweet.aggregate([
    { $match: {"tag": { "$in": trackingTrends }}},
    { $group: { _id: '$tag', avg: {$avg: '$sentiment' }}}
    ], (err, tweetResults) => {
      if (!err) {
        tweetResults.map((result) => 
        data.push({ 'tag': result._id, 'sentiment': result.avg }));
        console.log(data);
        res.json(data);
      } else {
        console.log(err);
        res.render('error', { message: 'Oops! There was an issue with a query.', error: err });
      }
    });
});

module.exports = router;
