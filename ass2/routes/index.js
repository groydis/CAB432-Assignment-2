var express = require('express');
var Twitter = require('twitter');
var Analyzer = require('natural').SentimentAnalyzer;
var stemmer = require('natural').PorterStemmer;

var router = express.Router();

var client = new Twitter({
	consumer_key: 'v0fKR9MEhNQSaJJztwkb7MWuh',
	consumer_secret: 'k6zFde0TV7Mpk7qyFHC6hZIFok9UWMoeOkNYTitFHUuDpfLxV7',
	access_token_key: '3317275614-u86Qt63fa0Unv8W0fTGzDqPRDbauFuQ60cJ28Wa',
	access_token_secret: 'G4HWno7YQriyV5t7hLeopa45vmzE3asJKFhnlze2aoU2A'
});

var analyzer = new Analyzer("English", stemmer, "afinn");


/* GET home page. */
router.get('/', function(req, res, next) {
	client.get('search/tweets', {q: '#spaceX'})
		.then(function (tweet) {
			for (var i = 0; i < tweet.statuses.length; i++) {
				var test = tweet.statuses[i].text.split(' ');
				console.log(analyzer.getSentiment(test));
			}
		})
		.catch(function (error) {
			throw error;
		})
	var trends = [];
	client.get('trends/place', {id: '23424748'})
		.then(function (results) {
			for (var i = 0; i < results[0].trends.length; i++) {
				console.log(results[0].trends[i].name)
				trends[i] = results[0].trends[i].name;
			}
        res.render('index', { title: 'Express', trending: trends});

		})
		.catch(function (error) {
			console.log(error);
			throw error;
		})
});

module.exports = router;
