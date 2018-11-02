var express = require('express');
var twitter = require('twitter');
var analyzer = require('natural').SentimentAnalyzer;
var stemmer = require('natural').PorterStemmer;
var nlp = require('compromise');


var router = express.Router();

const config = require('../config.js');

const client = new twitter({
  consumer_key: config.twitter.consumer.key,
  consumer_secret: config.twitter.consumer.secret,
  access_token_key: config.twitter.access.key,
  access_token_secret: config.twitter.access.secret
});

var sentimentAnalyzer = new analyzer("English", stemmer, "afinn");

var Tweet = require('../models/tweet.model');
var Trend = require('../models/trend.model');

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

function controlStream() {

}
let stream;
let refresh = true;
/* GET home page. */
router.post('/', function(req, res, next) {
	if (refresh === true) {
		Trend.remove().exec();
	  client.get('trends/place', {id: '23424748' }, function (error, results) {
		  if (!error) {
		  	console.log(results[0].trends);
		    for (var i = 0; i < results[0].trends.length; i++) {
		    	let tag = results[0].trends[i].name;
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
		  } else {
		  	console.log(error);
		  }
		});
		refresh = false;
		setTimeout(function () { 
			refresh = true;
			console.log('Trends will be reset on refresh');
		}, 600000);
	}
	res.sendStatus(200);
});

router.post('/start', function(req, res, next) {
	if (stream === undefined) {
		let query = req.body;
		let tracking = '';
		for (let i = 0; i < query.length; i++) {

			tracking += query[i]
			if (i != query.length - 1) {
				tracking += ', ';
			}
		} 
    if (stream) {
      setTimeout(function () { 
        stream.destroy()
        console.log('Stream timed out!');
        let x; 
        stream = x;
      }, 180000);
    }
		console.log(tracking);
		console.log("Stream Started!");
		stream = client.stream('statuses/filter', {track: tracking , language: 'en' });

		stream.on('data', function(tweet) {
			handleTweets(tweet).then(tweettext => {
				getTag(query, tweettext).then(tag => {
					processSentiment(tweettext).then(sentiment => {
						let t = new Tweet();
	          t.tag = tag;
	          t.tweet = tweettext;
	          t.sentiment = sentiment;
	          t.save(function(err) {
	            if (err) {
	              console.log('Save to DB error: ', err);
	            } else {
	              console.log('tag:' + tag);
	              console.log('tweet: ' + tweettext);
	              console.log('sentiment: ' + sentiment);
	            }
	          });
					})
					.catch(function(error){
						console.log('Sentiment error: ' + error);
					});
				})
				.catch(function(error){
					console.log('Tag error: ' + error)
				});
			})
			.catch(function(error){
				console.log('Tweet handle error: ' + error)
			});
		});
		stream.on('limit', function (message) {
		  console.log("Limit Reached: " + message);
		});

		stream.on('disconnect', function (message) {
		  console.log("Ooops! Disconnected: " + message);
		});
	} else {
		console.log("Stream already on!");
	}

	res.sendStatus(200);
});


router.post('/stop', function(req, res, next) {
	if (stream !== undefined) {
		console.log("Stream Stopped");
		stream.destroy()
		let x;
		stream = x;
	} else {
		console.log("No Stream Running!");
	}
	res.sendStatus(200);
});

module.exports = router;
