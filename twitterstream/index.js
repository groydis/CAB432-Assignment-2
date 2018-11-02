const twitter = require('twitter');
const request = require('request-promise-any');

const config = require('./config.js');

const client = new twitter({
  consumer_key: config.twitter.consumer.key,
  consumer_secret: config.twitter.consumer.secret,
  access_token_key: config.twitter.access.key,
  access_token_secret: config.twitter.access.secret
});

//var parameters = {id: 23424748 };
var tracking = '';
var trends = [];

client.get('trends/place', {id: '23424748' }, function (error, results) {
  console.log(results[0].trends);
  if (!error) {
    for (var i = 0; i < results[0].trends.length; i++) {
      trends[i] = results[0].trends[i].name;
    }
    for (var i = 0; i < trends.length; i++){
      if (i === trends.length -1 ){
        tracking += trends[i];
      } else {
        tracking += trends[i] + ',';
      }
    }
    var options = {
      uri: 'http://172.17.0.3:3001/trends',
      method: 'POST',
      body: { trends },
      simple: false,
      resolveWithFullResponse: true,
      json: true
    };

    request(options).then(function () {
      client.stream('statuses/filter', {track: tracking , language: 'en' },  function(stream, error) {
        if (error) {
          console.log("Oh noes!");
        }
        stream.on('data', function(tweet) {

          request({
            url: 'http://172.17.0.3:3001',
            method: 'POST',
            json: tweet
          }, function (err, res, body) {
            if (!err) {
              console.log('Stream Response: ' + res);
            } else {
              console.log('Unable to connect to server!');
            }
          });
        });
        stream.on('limit', function (message) {
          console.log("Limit Reached: " + message);
        });

        stream.on('disconnect', function (message) {
          console.log("Ooops! Disconnected: " + message);
        });
      });
    })
    .catch(function(error){
      console.log(error);
    });
  }
});

