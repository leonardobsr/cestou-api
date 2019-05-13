const _ = require ('underscore');

module.exports = {
  base64MimeType: function(string) {
	  var result = { extension: null, mimeType: null };
	  var mime = string.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/);
	  if (typeof string !== 'string') return null;
	  if (mime && mime.length) {
	  	let extension = mime[1].split('/');
	  	result.extension = extension[1];
	    result.mimeType = mime[1];
	  }
	  return result;
	},
	getLessonByModule: async function(objectId) {
		let Lesson = Parse.Object.extend('Lesson');
		let query = new Parse.Query(Lesson);
		
		query.equalTo('class', { __type: 'Pointer', className: 'Class', objectId: objectId });
		query.notEqualTo('active', false);

    return await query.find()
      .then((resp) => {
        return resp;
      });
	},
	isFavorite: async function(data) {
		let favorite = null;
		if (data.relationType === 3) {
			favorite = data.user.relation('moduleFavorite');
		} else {
			favorite = data.user.relation('mediaFavorite');
		}
		
		query = favorite.query();
		query.notEqualTo('active', false);
		query.equalTo("objectId", data.objectId);

		return await query.first()
			.then((resp) => {
				let bool = true;
				if (_.isNull(resp) || _.isUndefined(resp)) bool = false;
				return bool;
			})
			.catch((e) => { throw e; });
	},
	getLesson: async function(objectId) {
		let Lesson = Parse.Object.extend('Lesson');
		let query = new Parse.Query(Lesson);

		query.equalTo('class', { __type: 'Pointer', className: 'Class', objectId: objectId });
		query.notEqualTo('active', false);

		return query.find()
			.then((resp) => {
				return resp;
			})
			.catch((e) => { throw e; });
	}
}