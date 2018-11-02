var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var TrendSchema = new Schema({
	tag: {type: String, default: null}
});


module.exports = mongoose.model('trend', TrendSchema);