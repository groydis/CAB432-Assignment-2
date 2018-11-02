var express = require('express');
var request = require('request');
var router = express.Router();

var Trend = require('../models/trend.model');
var Tweet = require('../models/tweet.model');

//let server = 'http://localhost:3002/stream';
//let server = 'http://172.17.0.3:3002/stream';

let server = 'http://ec2-13-211-227-156.ap-southeast-2.compute.amazonaws.com:3002/stream';

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
        url: server,
        method: 'POST',
        form: {tags: tags}
      }, function (err, res, body) {
        if (!err) {
          console.log('Stream STOP Response: ' + res);
        } else {
          console.log('Unable to connect to stream server!');
        }
      });
			res.render('index', { title: tags, tags:  result, tracking: tags });
		} else { 
			res.render('index', { title: "Select #hashtag's to begin", tags: result, tracking: 'none' });
		}
	});
});


module.exports = router;
