const _ = require ('underscore');
const helpers = require ('./helpers.js');
require ('./triggers.js');

Parse.Cloud.define("getVersion", function(request, response) {
	return 'v2';
});