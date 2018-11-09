var express = require('express');
var twitter = require('twitter');
var request = require('request');

var router = express.Router();

const config = require('../config.js');

const client = new twitter({
  consumer_key: config.twitter.consumer.key,
  consumer_secret: config.twitter.consumer.secret,
  access_token_key: config.twitter.access.key,
  access_token_secret: config.twitter.access.secret
});

//let server = 'http://localhost:3001';
//let server = 'http://172.17.0.2:3001'
let server = 'http://ts-server-lb-1418829415.ap-southeast-2.elb.amazonaws.com:3001';


// Grab them trends and shoot them through to the server for processing
function getTrends() {
  client.get('trends/place', {id: '23424748' }, function (error, results) {
    if (!error) {
      let trends = results[0].trends;
      console.log(trends);
      request({
          url: server + '/trends',
          method: 'POST',
          json: trends
        }, function (err, res, body) {
          if (!err) {
            console.log('Trend Response: ' + res);
          } else {
            console.log('Unable to connect to server!');
          }
        });
    } else {
      console.log(error);
    }
  });
}
// We wanna do this ever 15 minutes, so lets kick if off 
getTrends();
setInterval(getTrends, 900000);

async  function handleTweets(body) {
  return new Promise((resolve) => {
    let tweet = body;
    let tweetMessage = '';
    if (tweet != undefined) { 
      if (tweet.extended_tweet) { 
        tweetMessage = tweet.extended_tweet.full_text;
      } else {
        if(tweet.retweeted_status) { 
          if (tweet.retweeted_status.extended_tweet) {
            tweetMessage = tweet.retweeted_status.extended_tweet.full_text;
          } else {
            tweetMessage = tweet.retweeted_status.text;
          }
        } else {
          tweetMessage = tweet.text;
        }
      }
    }
    resolve(tweetMessage);
  });
};

let stream = undefined;
let tags = '';
router.post('/stream', function(req, res, next) {
  if (tags === '') {
	 tags += req.body.tags;
  } else {
    let oldTags = tags.split(',');
    let newTags = req.body.tags.split(',');
    let combine = oldTags.concat(newTags);
    let filter = combine.filter(Boolean);
    let scrub = filter.filter(function (item, pos) {return filter.indexOf(item) == pos});

    console.log(scrub);
    tags = scrub.toString();
  }
  console.log('Tacking: ' + tags);
	if (stream === undefined) {
    console.log('New Stream!');
		stream = client.stream('statuses/filter', {track: tags , language: 'en' });
		stream.on('data', function(tweet) {
			handleTweets(tweet).then(result => {
        console.log(result);
        request({
          url: server + '/tweet',
          method: 'POST',
          form: { tweet: result,
                  tags: tags, }
        }, function (err, res, body) {
          if (err) {
            console.log('Unable to connect to server!');
          }
        });
			});
		});
    stream.on('limit', function (message) {
      console.log("Limit Reached: " + message);
    });

    stream.on('disconnect', function (message) {
      console.log("Ooops! Disconnected: " + message);
    });
    stream.on('error', function (message) {
      console.log("Ooops! Error: " + message);
    });
	} else {
    stream.destroy();
    console.log('Destroyed old stream! Making New Stream!');
    stream = client.stream('statuses/filter', {track: tags , language: 'en' });
    stream.on('data', function(tweet) {
      handleTweets(tweet).then(result => {
        console.log(result);
        request({
          url: server + '/tweet',
          method: 'POST',
          form: { tweet: result,
                  tags: tags, }
        }, function (err, res, body) {
          if (err) {
            console.log('Unable to connect to server!');
          }
        });
      });
    });
  }
  stream.on('limit', function (message) {
    console.log("Limit Reached: " + message);
  });

  stream.on('disconnect', function (message) {
    console.log("Ooops! Disconnected: " + message);
  });
  stream.on('error', function (message) {
      console.log("Ooops! Error: " + message);
  });
  setTimeout(function () { 
    stream.destroy();
    tags = '';
    console.log('Stream Destroyed due to delay!');
  }, 900000);
})


router.post('/stop', function(req, res, next) {
	if (stream !== undefined) {
		stream.destroy();
		stream = undefined;
		res.sendStatus(200);
	} else {
    res.sendStatus(200);
  }
});
module.exports = router;
