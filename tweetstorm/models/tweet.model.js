var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var TweeterSchema = new Schema({
	tag: {type: String, default: null},
	tweet: {type: String, default: null},
	sentiment: {type: Number, default: null},
});

module.exports = mongoose.model('tweet', TweeterSchema);