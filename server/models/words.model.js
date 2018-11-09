var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var WordsSchema = new Schema({
	tag: {type: String, default: null},
	word: {type: String, default: null},
});


module.exports = mongoose.model('word', WordsSchema);