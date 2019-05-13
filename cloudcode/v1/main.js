const _ = require ('underscore');
const helper = require ('./helpers.js');
const config = require('../../config/env-variables');
require ('./triggers.js');

Parse.Cloud.define('getVersion', function() {
	return 'v1';
});

Parse.Cloud.define('login', async (request) => {
	if ((_.isNull(request.params.username) || _.isUndefined(request.params.username)) && (_.isNull(request.params.password) || _.isUndefined(request.params.password))) {
		throw 'Needs username and password params to execute task.';
	} else {
		return await Parse.User.logIn(request.params.username, request.params.password)
			.then((resp) => {
				if (!resp.get('isAdmin')) throw 'Este usuário não é administrador!';
				return resp;
			})
			.catch((e) => {
				throw e;
			});
	}
});

Parse.Cloud.define('home', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {

		let resultJson = {
			diary: null,
			masterClass: []
		};

		let Diary = Parse.Object.extend('Diary');
		let qDiary = new Parse.Query(Diary);

		let Module = Parse.Object.extend('Module');
		let qModule = new Parse.Query(Module);

		let today = new Date();
		let initDay = new Date(today.setHours(0, 0, 0));
		let endDay = new Date(today.setHours(23, 59, 59));
		
		qDiary.greaterThanOrEqualTo('diaryDate', { '__type': 'Date', 'iso': initDay.toISOString() });
		qDiary.lessThanOrEqualTo('diaryDate', { '__type': 'Date', 'iso': endDay.toISOString() });
		qDiary.equalTo('user', { __type: 'Pointer', className: '_User', objectId: currentUser.id });

		qModule.equalTo('featured', true);
		
		let promises = [qDiary.first(), qModule.find()];

		await Promise.all(promises)
			.then((resp) => {
				resultJson.diary = resp[0];
				resultJson.masterClass = resp[1];
				return Promise.resolve();
			}, (error) => {
				throw error;
			});

		return resultJson;
	}
});

Parse.Cloud.define('categories', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {

		const Category = Parse.Object.extend("Category");
		const query = new Parse.Query(Category);

		query.equalTo("type", request.params.type);
		query.equalTo("active", true);
		query.ascending('order');

		return await query.find()
			.then((resp) => { 
				return resp;
			})
			.catch((e) => {
				throw e;
			});
	}
});

Parse.Cloud.define('feedMeditationMusic', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {
		let query = null;

		if(request.params.favorite){
			let favorite = currentUser.relation('mediaFavorite');
			query = favorite.query();
			
			query.ascending('createdAt');

		} else {

			let Media = Parse.Object.extend('Media');
			query = new Parse.Query(Media);

			if(request.params.category){
				query.equalTo("category", { __type: 'Pointer', className: 'Category', objectId: request.params.category });
			}

			query.ascending('order');
		}

		query.notEqualTo('active', false);
		query.limit(request.params.limit);
		query.skip(request.params.skip);
		query.equalTo("type", request.params.type);

		const resultJson = await query.find()
			.then((resp) => {
				return resp;
			})
			.catch((e) => { throw e; });

		return resultJson;
	}
});

Parse.Cloud.define('getMeditationMusic', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {

		let Media = Parse.Object.extend('Media');
		query = new Parse.Query(Media);

		query.notEqualTo('active', false);
		query.equalTo("objectId", request.params.objectId);

		let UserMasterClassLessonRating = Parse.Object.extend('UserMediaRating');
		queryUMR = new Parse.Query(UserMediaRating);
		
		queryUMR.equalTo('user', { __type: 'Pointer', className: '_User', objectId: currentUser.id });
		queryUMR.equalTo('media', { __type: 'Pointer', className: 'Media', objectId: request.params.objectId });

		const resultJson = await query.first().then((result) => {
			newResult = result.toJSON();

			let data = {
				user: currentUser,
				relationType: newResult.type,
				objectId: request.params.objectId
			}

			const promises = [queryUMR.first(), helper.isFavorite(data)];

			return Promise.all(promises).then((resp) => {
				newResult.rating = (resp[0])? resp[0].get('rating') : 0;
				newResult.isFavorite = resp[1];
				return newResult;
			})
		})
		.catch((e) => { throw e; });

		return resultJson;
	}
});

Parse.Cloud.define('ratingMeditationMusic', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {

		let UserMediaRating = Parse.Object.extend('UserMediaRating');
		query = new Parse.Query(UserMediaRating);
		
		query.equalTo('user', { __type: 'Pointer', className: '_User', objectId: currentUser.id });
		query.equalTo('media', { __type: 'Pointer', className: 'Media', objectId: request.params.objectId });

		return await query.first()
			.then((resp) => {
				let userMediaRating = new UserMediaRating();
					
				userMediaRating.set("user", { __type: 'Pointer', className: '_User', objectId: currentUser.id });
				userMediaRating.set("media", { __type: 'Pointer', className: 'Media', objectId: request.params.objectId });
				userMediaRating.set("rating", request.params.rating);

				if (resp) userMediaRating.id = resp.id;
				
				return userMediaRating.save()
					.then((resp) => {
						return { "rating": resp.get('rating') };
					}, (e) => {
						throw e;
					});
			})
			.catch((e) => { throw e; });
	}
});

Parse.Cloud.define('feedMasterClass', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {
		let query = null;
		if(request.params.favorite){
			let favorite = currentUser.relation('moduleFavorite');
			query = favorite.query();

			query.ascending('createdAt');
		} else {
			let Module = Parse.Object.extend('Module');
			query = new Parse.Query(Module);

			if(request.params.category){
				query.equalTo("category", { __type: 'Pointer', className: 'Category', objectId: request.params.category });
			}

			query.ascending('order');
		}

		query.notEqualTo('active', false);
		query.limit(request.params.limit);
		query.skip(request.params.skip);

		const resultJson = await query.find()
			.then((resp) => {
				return resp;
			})
			.catch((e) => { throw e; });

		return resultJson;
	}
});

Parse.Cloud.define('getMasterClass', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {

		let Class = Parse.Object.extend('Class');
		let query = new Parse.Query(Class);
		
		query.equalTo('module', { __type: 'Pointer', className: 'Module', objectId: request.params.objectId });
		query.notEqualTo('active', false);
				
		return await query.find()
			.then(async (results) => {
				if (results) {
					let resultsJson = [];
					await Promise.all(results.map(async (moduleClass) => {
						let moduleClassJson = moduleClass.toJSON();
						moduleClassJson.lesson = [];
						await helper.getLesson(moduleClass.id)
							.then((results) => {
								if (results.length > 0) {
									results.forEach(lesson => {
										moduleClassJson.lesson.push(lesson.toJSON());
									});
								}
							})
							.catch((e) => { throw e; });
						resultsJson.push(moduleClassJson);
					}));
					
					return resultsJson.sort(function(a,b){
						if (a.order < b.order) return -1;
						if (a.order > b.order) return 1;
					});
				}
			})
			.catch((e) => { throw e; });
	}
});

Parse.Cloud.define('ratingMasterClassLesson', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {

		let UserMasterClassLessonRating = Parse.Object.extend('UserMasterClassLessonRating');
		query = new Parse.Query(UserMasterClassLessonRating);
		
		query.equalTo('user', { __type: 'Pointer', className: '_User', objectId: currentUser.id });
		query.equalTo('lesson', { __type: 'Pointer', className: 'Lesson', objectId: request.params.objectId });

		return await query.first()
			.then((resp) => {
				let userMasterClassLessonRating = new UserMasterClassLessonRating();
					
				userMasterClassLessonRating.set("user", { __type: 'Pointer', className: '_User', objectId: currentUser.id });
				userMasterClassLessonRating.set("lesson", { __type: 'Pointer', className: 'Lesson', objectId: request.params.objectId });
				userMasterClassLessonRating.set("rating", request.params.rating);
				userMasterClassLessonRating.set("comment", request.params.comment);

				if (resp) userMasterClassLessonRating.id = resp.id;
				
				return userMasterClassLessonRating.save()
					.then((resp) => {
						return { "rating": resp.get('rating'), "comment": resp.get('comment') };
					}, (e) => {
						throw e;
					});
			})
			.catch((e) => { throw e; });
	}
});

Parse.Cloud.define('toogleFavorite', async function(request) {
  let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    response.error('Needs user to execute task.');
  }else{
		
		if ((_.isNull(request.params.relationType) || _.isUndefined(request.params.relationType)) &&
				(_.isNull(request.params.objectId) || _.isUndefined(request.params.objectId))) {
			throw 'Needs some param to execute task.';
		}
			
		if (request.params.relationType === 3) {
			var relation = currentUser.relation('moduleFavorite');
			var Module = Parse.Object.extend("Module");
			var item = new Module();
		} else {
			var relation = currentUser.relation('mediaFavorite');
			var Media = Parse.Object.extend("Media");
			var item = new Media();	
		}

		item.id = request.params.objectId;

    var action = '';
    if(request.params.isFavorite){
      action = 'Like'
      relation.add(item);
    }else if(!request.params.isFavorite){
      action = 'Dislike'
      relation.remove(item);
    }else{
      throw 'Needs isFavorite param to execute task.';
    }
    
    const result = await currentUser.save(null, { useMasterKey: true })
      .then((result) => {
        return action + ' action performed successfully';
      },(error) => {
        throw error;
      }
		);
		
		return result;
  }
});

Parse.Cloud.define('isFavorite', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {

		let data = {
			user: currentUser,
			relationType: request.params.relationType,
			objectId: request.params.objectId
		}

		const resultJson = await helper.isFavorite(data)
			.then((resp) => {
				return resp;
			})
			.catch((e) => {
				throw e;
			});

		return resultJson;
	}
});

Parse.Cloud.define('changeImage', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {
		if ((_.isNull(request.params.image) || _.isUndefined(request.params.image))) {
			throw 'Oops! Missing parameter in this request.';
		} else {

			const previousImage = currentUser.get('image');
			if(!_.isNull(previousImage) && !_.isUndefined(previousImage)) {
				let req = request;
				req.user = currentUser;
				req.params.url = previousImage;
				Parse.Cloud.run('deleteFile', { 'useMasterKey': true,'url': previousImage });
			}

			let ext = helper.base64MimeType(request.params.image);
			let base64 = request.params.image;
			file = new Parse.File(currentUser.id + '.' + ext.extension, { base64: base64 });

			const result = await file.save()
				.then((result) => {
					currentUser.set('image', result.url());
					return currentUser.save(null, {useMasterKey : true})
						.then(() => {
							return result.url();
						}, (error) => {
							throw error;
						});
				}, (error) => {
					throw error;
				});
			return result;
		}
  }
});

Parse.Cloud.define('deleteFile', async function(request) {
	if(_.isNull(request.params.useMasterKey) || _.isUndefined(request.params.useMasterKey)) {
		let currentUser = request.user;
		if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
			throw 'Needs user to execute task.';
		}
	}

	let myAppId = ('/' + config.versions[0].parse_server.application_id);
	let image = request.params.url.split(myAppId);
	return await Parse.Cloud.httpRequest({
		method: 'DELETE',
		url: image[0] + image[1],
		headers: {
			'X-Parse-Application-Id': config.versions[0].parse_server.application_id,
			'X-Parse-Master-Key' : config.versions[0].parse_server.master_key
		}
	}).then(() => {
		return {'sucess': true, 'message': 'File successfully deleted!'};
	}, (error) => {
		throw error;
	});
});

Parse.Cloud.define('getDiary', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {

		let Diary = Parse.Object.extend('Diary');
		let query = new Parse.Query(Diary);

		let dateSearch = new Date(request.params.diaryDate);
		let initDateSearch = new Date(dateSearch.setHours(0, 0, 0));
		let endDateSearch = new Date(dateSearch.setHours(23, 59, 59));

		query.greaterThanOrEqualTo('diaryDate', { '__type': 'Date', 'iso': initDateSearch.toISOString() });
		query.lessThanOrEqualTo('diaryDate', { '__type': 'Date', 'iso': endDateSearch.toISOString() });
				
		return await query.first()
			.catch((e) => { throw e; });
	}
});

Parse.Cloud.define('createDiary', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {

		let Diary = Parse.Object.extend('Diary');
		let query = new Parse.Query(Diary);

		let dateSearch = new Date(request.params.diaryDate);
		let initDateSearch = new Date(dateSearch.setHours(0, 0, 0));
		let endDateSearch = new Date(dateSearch.setHours(23, 59, 59));

		query.equalTo('user', { __type: 'Pointer', className: '_User', objectId: currentUser.id });
		query.greaterThanOrEqualTo('diaryDate', { '__type': 'Date', 'iso': initDateSearch.toISOString() });
		query.lessThanOrEqualTo('diaryDate', { '__type': 'Date', 'iso': endDateSearch.toISOString() });
				
		return await query.first()
			.then(async (result) => {
				var Diary = Parse.Object.extend("Diary");
				var diary = new Diary();

				if (result) {
					diary.id = result.id;
				}

				if (currentUser.id) diary.set('user', { __type: 'Pointer', className: '_User', objectId: currentUser.id });
				if (request.params.diaryDate) diary.set('diaryDate', { '__type': 'Date', 'iso': initDateSearch.toISOString() });
				if (request.params.status) diary.set('status', request.params.status);
				if (request.params.statusIntensity) diary.set('statusIntensity', request.params.statusIntensity);
				if (request.params.thoughtsToday) diary.set('thoughtsToday', request.params.thoughtsToday);
				if (request.params.learnToday) diary.set('learnToday', request.params.learnToday);
				if (request.params.reasonFeeling) diary.set('reasonFeeling', request.params.reasonFeeling);
				if (request.params.youFeeling) diary.set('youFeeling', request.params.youFeeling);
				if (request.params.aboutFeeling) diary.set('aboutFeeling', request.params.aboutFeeling);

				return await diary.save()
					.catch((e) => { throw e; });
			})
			.catch((e) => { throw e; });
	}
});

// Admin
Parse.Cloud.define('getUser', async (request) => {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  }else{

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		let resultJson = { count: 0, items: [] };
		let User = Parse.Object.extend('_User');
		let query = new Parse.Query(User);

		if (request.params.query) {
			query.matches('fullname', new RegExp(request.params.query, 'gi'));
		}

		if (request.params.isAdmin) {
			query.equalTo('isAdmin', true);
		}
		query.limit(request.params.limit);
		query.skip(request.params.skip * request.params.limit);

		if (request.params.sortBy) {
			if (!request.params.descending) {
				query.ascending(request.params.sortBy);
			} else {
				query.descending(request.params.sortBy);
			}
		} else {
			query.ascending('fullname');
		}

		if (request.params.objectId) {
			query.equalTo('objectId', request.params.objectId);
		}

		resultJson.count = await query.count();

		await query.find({ useMasterKey: true })
			.then((results) => {
				results.forEach((result) => {
					resultJson.items.push(result.toJSON());
				});
			})
			.catch((e) => { throw e; });
		
		return resultJson;
  }
});

Parse.Cloud.define('saveUser', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Precisa de usuário para executar a tarefa.';
  } else {

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		if (
      (_.isNull(request.params.fullname) || _.isUndefined(request.params.fullname)) ||
      (_.isNull(request.params.email) || _.isUndefined(request.params.email))
    ) {
			throw 'Opa! faltou campo obrigatório.';
		} else {

			var user = new Parse.User();
			if (request.params.objectId) user.id = request.params.objectId;
			if (request.params.fullname) user.set("fullname", request.params.fullname);
			if (request.params.email) user.set("username", request.params.email);
			if (request.params.email) user.set("email", request.params.email);
			if (request.params.password) user.set("password", request.params.password);
			user.set("isAdmin", true);

			var file = null;
			if (!_.isNull(request.params.image) && !_.isUndefined(request.params.image)) {
				if (!request.params.imageDefault) {
					if(!_.isNull(request.params.imagePrevious) && !_.isUndefined(request.params.imagePrevious)) {
						Parse.Cloud.run('deleteFile', { 'useMasterKey': true,'url': request.params.imagePrevious });
					}
					let ext = helper.base64MimeType(request.params.image);
					file = new Parse.File("image." + ext.extension, { base64: request.params.image });
				}
			}

			if (request.params.objectId) {
				return await user.save(null, {useMasterKey : true})
					.then((resp) => {
						if (file) {
							file.save()
								.then(async (resp) => {
									let query = new Parse.Query(Parse.User);
									let userAgain = await query.get(user.id);
									userAgain.set("image", resp.url());
									return await userAgain.save(null, {useMasterKey : true})
										.catch((e) => {
											throw e;
										});
								},(e) => {
									throw e;
								});
						}
						return resp;
					})
					.then((resp) => {
						return resp;
					},(e) => {
						throw e;
					}
				);
			} else {
				return await user.signUp()
					.then((resp) => {
						if (file) {
							file.save()
								.then(async (resp) => {
									let query = new Parse.Query(Parse.User);
									let userAgain = await query.get(user.id);
									userAgain.set("image", resp.url());
									return await userAgain.save(null, {useMasterKey : true})
										.catch((e) => {
											throw e;
										});
								},(e) => {
									throw e;
								});
						}
						return resp;
					})
					.then((resp) => {
						return resp;
					},(e) => {
						throw e;
					}
				);
			}
		}
  }
});

Parse.Cloud.define('removeUser', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
		throw 'Precisa de usuário para executar a tarefa.';
  } else {

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		if (
			(_.isNull(request.params.objectId) || _.isUndefined(request.params.objectId))
		) {
			throw 'Precisa de parâmetros objectId e userObjectId para executar a tarefa.';
		}

		if (request.params.objectId === currentUser.id) {
			throw 'Você não pode excluir seu próprio usuário.';
		}

		let User = Parse.Object.extend('_User');
		let query = new Parse.Query(User);

		query.equalTo('objectId', request.params.objectId);

		return await query.first()
			.then(async(resp) => {
				return await resp.destroy({useMasterKey : true})
					.then(() => {
						if(!_.isNull(request.params.image) && !_.isUndefined(request.params.image)) {
							Parse.Cloud.run('deleteFile', { 'useMasterKey': true,'url': request.params.image });
						}
					}, (e) => {
						throw e;
					});
			},(e) => {
			});
  }
});

Parse.Cloud.define('getCategory', async (request) => {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  }else{

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		let resultJson = { count: 0, items: [] };
		let Category = Parse.Object.extend('Category');
		let query = new Parse.Query(Category);

		if (request.params.query) {
			query.matches('name', new RegExp(request.params.query, 'gi'));
		}

		if (request.params.type) {
			query.equalTo('type', request.params.type);
		}

		if (request.params.limit) {
			query.limit(request.params.limit);
		}

		if (request.params.limit && request.params.skip) {
			query.skip(request.params.skip * request.params.limit);
		}

		if (request.params.sortBy) {
			if (!request.params.descending) {
				query.ascending(request.params.sortBy);
			} else {
				query.descending(request.params.sortBy);
			}
		} else {
			query.ascending('name');
		}

		if (request.params.objectId) {
			query.equalTo('objectId', request.params.objectId);
		}

		resultJson.count = await query.count();

		resultJson.items = await query.find({ useMasterKey: true })
			.then((results) => {
				return results;
			})
			.catch((e) => { throw e; });
		
		return resultJson;
  }
});

Parse.Cloud.define('getMedia', async (request) => {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  }else{

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		let resultJson = { count: 0, items: [] };
		let Media = Parse.Object.extend('Media');
		let query = new Parse.Query(Media);
		query.include('category');

		if (request.params.query) {
			query.matches('name', new RegExp(request.params.query, 'gi'));
		}

		query.limit(request.params.limit);
		query.skip(request.params.skip * request.params.limit);
		query.equalTo('type', request.params.type);

		if (request.params.sortBy) {
			if (!request.params.descending) {
				query.ascending(request.params.sortBy);
			} else {
				query.descending(request.params.sortBy);
			}
		} else {
			query.ascending('name');
		}

		if (request.params.category) {
			query.equalTo('category', { __type: 'Pointer', className: 'Category', objectId: request.params.category });	
		}

		if (request.params.objectId) {
			query.equalTo('objectId', request.params.objectId);
		}

		resultJson.count = await query.count();

		resultJson.items = await query.find({ useMasterKey: true })
			.then((results) => {
				return results;
			})
			.catch((e) => { throw e; });
		
		return resultJson;
  }
});

Parse.Cloud.define('saveMedia', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Precisa de usuário para executar a tarefa.';
  } else {

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		if (
      (_.isNull(request.params.category) || _.isUndefined(request.params.category)) ||
      (_.isNull(request.params.name) || _.isUndefined(request.params.name)) ||
			(_.isNull(request.params.composer) || _.isUndefined(request.params.composer)) ||
			(_.isNull(request.params.image) || _.isUndefined(request.params.image)) ||
			(_.isNull(request.params.mainaudio) || _.isUndefined(request.params.mainaudio)) ||
			(_.isNull(request.params.duration) || _.isUndefined(request.params.duration)) ||
			(_.isNull(request.params.description) || _.isUndefined(request.params.description)) ||
			(_.isNull(request.params.order) || _.isUndefined(request.params.order)) ||
			(_.isNull(request.params.type) || _.isUndefined(request.params.type))
    ) {
			throw 'Opa! faltou campo obrigatório.';
		} else {

			if (request.params.type === 1) {
				if (_.isNull(request.params.secondaryaudio) || _.isUndefined(request.params.secondaryaudio)) {
					throw 'Opa! faltou campo obrigatório.';
				}
			}

			var Media = Parse.Object.extend("Media");
			var media = new Media();
			if (request.params.objectId) media.id = request.params.objectId;

			if (request.params.category) {
				media.set("category", { 
					__type: 'Pointer',
					className: 'Category', 
					objectId: (request.params.category.objectId) ? request.params.category.objectId : request.params.category
				});
			}

			if (request.params.name) media.set("name", request.params.name);
			if (request.params.composer) media.set("composer", request.params.composer);
			if (request.params.image) media.set("image", request.params.image);
			if (request.params.mainaudio) media.set("mainaudio", request.params.mainaudio);
			if (request.params.secondaryaudio) media.set("secondaryaudio", request.params.secondaryaudio);
			if (request.params.duration) media.set("duration", request.params.duration);
			if (request.params.description) media.set("description", request.params.description);
			if (request.params.order) media.set("order", request.params.order);
			if (request.params.type) media.set("type", request.params.type);

			media.set("premium", (request.params.premium) ? request.params.premium : false);
			media.set("active", (request.params.active) ? request.params.active : false);

			return await media.save(null, {useMasterKey : true})
				.then(async (result) => {
					return result;
				}, (e) => {
					throw e;
				});
		}
  }
});

Parse.Cloud.define('removeMedia', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
		throw 'Precisa de usuário para executar a tarefa.';
  } else {

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		if (
			(_.isNull(request.params.objectId) || _.isUndefined(request.params.objectId))
		) {
			throw 'Precisa de parâmetros objectId e userObjectId para executar a tarefa.';
		}

		var Media = Parse.Object.extend("Media");
    var media = new Media();
		media.id = request.params.objectId;

		return await media.destroy(null, {useMasterKey : true})
			.then(() => {
				if(!_.isNull(request.params.image) && !_.isUndefined(request.params.image)) {
					Parse.Cloud.run('deleteFile', { 'useMasterKey': true,'url': request.params.image });
				}
				if(!_.isNull(request.params.mainaudio) && !_.isUndefined(request.params.mainaudio)) {
					Parse.Cloud.run('deleteFile', { 'useMasterKey': true,'url': request.params.mainaudio });
				}
				if(!_.isNull(request.params.secondaryaudio) && !_.isUndefined(request.params.secondaryaudio)) {
					Parse.Cloud.run('deleteFile', { 'useMasterKey': true,'url': request.params.secondaryaudio });
				}
			}, (e) => {
				throw e;
			});
  }
});

Parse.Cloud.define('getModule', async (request) => {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  }else{

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		let resultJson = { count: 0, items: [] };
		let Module = Parse.Object.extend('Module');
		let query = new Parse.Query(Module);
		query.include('category');

		if (request.params.query) {
			query.matches('name', new RegExp(request.params.query, 'gi'));
		}

		query.limit(request.params.limit);
		query.skip(request.params.skip * request.params.limit);

		if (request.params.sortBy) {
			if (!request.params.descending) {
				query.ascending(request.params.sortBy);
			} else {
				query.descending(request.params.sortBy);
			}
		} else {
			query.ascending('name');
		}

		if (request.params.category) {
			query.equalTo('category', { __type: 'Pointer', className: 'Category', objectId: request.params.category });	
		}

		if (request.params.objectId) {
			query.equalTo('objectId', request.params.objectId);
		}

		resultJson.count = await query.count();

		resultJson.items = await query.find()
			.then((results) => {
				return results;
			})
			.catch((e) => { throw e; });
		
		return resultJson;
  }
});

Parse.Cloud.define('saveModule', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Precisa de usuário para executar a tarefa.';
  } else {
		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		if (
      (_.isNull(request.params.category) || _.isUndefined(request.params.category)) ||
      (_.isNull(request.params.name) || _.isUndefined(request.params.name)) ||
			(_.isNull(request.params.image) || _.isUndefined(request.params.image)) ||
			(_.isNull(request.params.shortDescription) || _.isUndefined(request.params.shortDescription)) ||
			(_.isNull(request.params.order) || _.isUndefined(request.params.order))
    ) {
			throw 'Opa! faltou campo obrigatório.';
		} else {

			var ModuleClass = Parse.Object.extend("Module");
			var moduleClass = new ModuleClass();
			
			if (request.params.objectId) moduleClass.id = request.params.objectId;

			if (request.params.category) {
				moduleClass.set("category", { 
					__type: 'Pointer',
					className: 'Category', 
					objectId: (request.params.category.objectId) ? request.params.category.objectId : request.params.category
				});
			}

			if (request.params.name) moduleClass.set("name", request.params.name);
			if (request.params.image) moduleClass.set("image", request.params.image);
			if (request.params.shortDescription) moduleClass.set("shortDescription", request.params.shortDescription);
			if (request.params.order) moduleClass.set("order", request.params.order);

			moduleClass.set("featured", (request.params.featured) ? request.params.featured : false);
			moduleClass.set("premium", (request.params.premium) ? request.params.premium : false);
			moduleClass.set("active", (request.params.active) ? request.params.active : false);

			return await moduleClass.save(null, {useMasterKey : true})
				.then(async (result) => {
					return result;
				}, (e) => {
					throw e;
				});
		}
  }
});

Parse.Cloud.define('removeModule', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
		throw 'Precisa de usuário para executar a tarefa.';
  } else {

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		if (
			(_.isNull(request.params.objectId) || _.isUndefined(request.params.objectId))
		) {
			throw 'Precisa de parâmetros objectId e userObjectId para executar a tarefa.';
		}

		var ModuleClass = Parse.Object.extend("Module");
    var moduleClass = new ModuleClass();
		moduleClass.id = request.params.objectId;

		let ClassOBJ = Parse.Object.extend('Class');
		let query = new Parse.Query(ClassOBJ);

		query.equalTo('module', { __type: 'Pointer', className: 'Module', objectId: request.params.objectId });	

		return await query.find()
			.then(async (results) => {
				results.forEach(async (result) => {
					let Lesson = Parse.Object.extend('Lesson');
					let query = new Parse.Query(Lesson);

					query.equalTo('class', { __type: 'Pointer', className: 'Class', objectId: result.id });	

					await query.find()
						.then((results) => {
							return Parse.Object.destroyAll(results)
								.catch((e) => { throw e; });
						})
						.catch((e) => { throw e; });
				});

				return Parse.Object.destroyAll(results)
						.catch((e) => { throw e; });
			})
			.then(async () => {
				return await moduleClass.destroy(null, {useMasterKey : true})
					.then(() => {
						if(!_.isNull(request.params.image) && !_.isUndefined(request.params.image)) {
							Parse.Cloud.run('deleteFile', { 'useMasterKey': true,'url': request.params.image });
						}
					}, (e) => {
						throw e;
					});
			})
			.catch((e) => { throw e; });
  }
});

Parse.Cloud.define('getClass', async (request) => {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  }else{

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		let resultJson = { count: 0, items: [] };
		let ModuleClass = Parse.Object.extend('Class');
		let query = new Parse.Query(ModuleClass);

		if (request.params.query) {
			query.matches('name', new RegExp(request.params.query, 'gi'));
		}

		query.limit(request.params.limit);
		query.skip(request.params.skip * request.params.limit);

		if (request.params.moduleClass) {
			query.equalTo('module', { __type: 'Pointer', className: 'Module', objectId: request.params.moduleClass });	
		}

		if (request.params.objectId) {
			query.equalTo('objectId', request.params.objectId);
		}

		if (request.params.sortBy) {
			if (!request.params.descending) {
				query.ascending(request.params.sortBy);
			} else {
				query.descending(request.params.sortBy);
			}
		} else {
			query.ascending('name');
		}

		resultJson.count = await query.count();

		resultJson.items = await query.find()
			.then((results) => {
				return results;
			})
			.catch((e) => { throw e; });
		
		return resultJson;
  }
});

Parse.Cloud.define('saveClass', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Precisa de usuário para executar a tarefa.';
  } else {
		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		if (
      (_.isNull(request.params.name) || _.isUndefined(request.params.name)) ||
			(_.isNull(request.params.order) || _.isUndefined(request.params.order))
    ) {
			throw 'Opa! faltou campo obrigatório.';
		} else {

			var ModuleClass = Parse.Object.extend("Class");
			var moduleClass = new ModuleClass();
			
			if (request.params.objectId) moduleClass.id = request.params.objectId;

			if (request.params.name) moduleClass.set("name", request.params.name);
			moduleClass.set("order", (request.params.order) ? request.params.order : 0);

			moduleClass.set("intro", (request.params.intro) ? request.params.intro : false);
			moduleClass.set("active", (request.params.active) ? request.params.active : false);

			moduleClass.set("module", { 
				__type: 'Pointer',
				className: 'Module', 
				objectId: (request.params.module.objectId) ? request.params.module.objectId : request.params.module
			});

			return await moduleClass.save()
				.catch((e) => {
					throw e;
				});
		}
  }
});

Parse.Cloud.define('removeClass', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
		throw 'Precisa de usuário para executar a tarefa.';
  } else {

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		if (
			(_.isNull(request.params.objectId) || _.isUndefined(request.params.objectId))
		) {
			throw 'Precisa de parâmetros objectId e userObjectId para executar a tarefa.';
		}

		var ClassOBJ = Parse.Object.extend("Class");
    var classObj = new ClassOBJ();
		classObj.id = request.params.objectId;

		let Lesson = Parse.Object.extend('Lesson');
		let query = new Parse.Query(Lesson);

		query.equalTo('class', { __type: 'Pointer', className: 'Class', objectId: request.params.objectId });	

		return await query.find()
			.then(async (results) => {
				return Parse.Object.destroyAll(results)
						.catch((e) => { throw e; });
			})
			.then(async () => {
				return await classObj.destroy(null, {useMasterKey : true})
					.catch((e) => { throw e; });
			})
			.catch((e) => { throw e; });
  }
});

Parse.Cloud.define('getLesson', async (request) => {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  }else{

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		let resultJson = { count: 0, items: [] };
		let Lesson = Parse.Object.extend('Lesson');
		let query = new Parse.Query(Lesson);

		if (request.params.query) {
			query.matches('name', new RegExp(request.params.query, 'gi'));
		}

		query.limit(request.params.limit);
		query.skip(request.params.skip * request.params.limit);

		if (request.params.class) {
			query.equalTo('class', { __type: 'Pointer', className: 'Class', objectId: request.params.class });	
		}

		if (request.params.objectId) {
			query.equalTo('objectId', request.params.objectId);
		}
		
		if (request.params.sortBy) {
			if (!request.params.descending) {
				query.ascending(request.params.sortBy);
			} else {
				query.descending(request.params.sortBy);
			}
		} else {
			query.ascending('name');
		}

		resultJson.count = await query.count();

		resultJson.items = await query.find()
			.then((results) => {
				return results;
			})
			.catch((e) => { throw e; });
		
		return resultJson;
  }
});

Parse.Cloud.define('saveLesson', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Precisa de usuário para executar a tarefa.';
  } else {
		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		if (
      (_.isNull(request.params.name) || _.isUndefined(request.params.name)) ||
			(_.isNull(request.params.video) || _.isUndefined(request.params.video)) ||
			(_.isNull(request.params.duration) || _.isUndefined(request.params.duration)) ||
			(_.isNull(request.params.indication) || _.isUndefined(request.params.indication)) ||
			(_.isNull(request.params.description) || _.isUndefined(request.params.description)) ||
			(_.isNull(request.params.order) || _.isUndefined(request.params.order))
    ) {
			throw 'Opa! faltou campo obrigatório.';
		} else {

			var Lesson = Parse.Object.extend("Lesson");
			var lesson = new Lesson();
			
			if (request.params.objectId) lesson.id = request.params.objectId;

			if (request.params.name) lesson.set("name", request.params.name);
			if (request.params.video) lesson.set("video", request.params.video);
			if (request.params.duration) lesson.set("duration", request.params.duration);
			if (request.params.indication) lesson.set("indication", request.params.indication);
			if (request.params.description) lesson.set("description", request.params.description);
			if (request.params.order) lesson.set("order", request.params.order);
			
			lesson.set("active", (request.params.active) ? request.params.active : false);

			lesson.set("class", { 
				__type: 'Pointer',
				className: 'Class', 
				objectId: (request.params.class.objectId) ? request.params.class.objectId : request.params.class
			});

			return await lesson.save()
				.catch((e) => {
					throw e;
				});
		}
  }
});

Parse.Cloud.define('removeLesson', async function (request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
		throw 'Precisa de usuário para executar a tarefa.';
  } else {

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		if (
			(_.isNull(request.params.objectId) || _.isUndefined(request.params.objectId))
		) {
			throw 'Precisa de parâmetros objectId para executar a tarefa.';
		}

		var Lesson = Parse.Object.extend("Lesson");
    var lesson = new Lesson();
		lesson.id = request.params.objectId;

		return await lesson.destroy(null, {useMasterKey : true})
			.catch((e) => {
				throw e;
			});
  }
});

Parse.Cloud.define('subscribePlan', async function (request) {
	let currentUser = request.user;
	if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
		throw 'Precisa de usuário para executar a tarefa.';
	} else {

		if ((_.isNull(request.params.planId) || _.isUndefined(request.params.planId))) {
			throw 'Precisa de parâmetro planId para executar a tarefa.';
		}

		var Subscription = Parse.Object.extend("Subscription");
		var subscription = new Subscription();
		subscription.id = request.params.planId;

		currentUser.set("subscription", subscription);

		return await currentUser.save(null, {useMasterKey : true})
		.then((resp) => {
			return resp;
		}, (e) => {
			throw e;
		});
	}
});

Parse.Cloud.define('search', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {
		if ((_.isNull(request.params.search) || _.isUndefined(request.params.search))) {
			throw 'Opa! faltou campo obrigatório.';
		} else {

			let resultJson = {
				meditation: [],
				music: [],
				masterClass: [],
			};

			let Media = Parse.Object.extend('Media');
			queryMedia = new Parse.Query(Media);
			queryMedia.matches('name', new RegExp(request.params.search, 'gi'));
			queryMedia.notEqualTo('active', false);

			let Module = Parse.Object.extend('Module');
			queryModule = new Parse.Query(Module);
			queryModule.matches('name', new RegExp(request.params.search, 'gi'));
			queryModule.notEqualTo('active', false);

			const promises = [queryMedia.find(), queryModule.find()];

			await Promise.all(promises)
				.then((resp) => {
					if (resp[0].length > 0) {
						resp[0].forEach((media) => {
							if (media.get('type') === 1) {
								resultJson.meditation.push(media);
							} else {
								resultJson.music.push(media);
							}
						})
					}
					resultJson.masterClass = resp[1];
				})
				.catch((e) => { throw e; });
			
			return resultJson;
		}
	}
});

Parse.Cloud.define('removeTemp', async function(request) {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  } else {
		if ((_.isNull(request.params.temp) || _.isUndefined(request.params.temp))) {
			throw 'Opa! faltou campo obrigatório.';
		} else {
			for (let index = 0; index < request.params.temp.length; index++) {
				if (!(_.isNull(request.params.temp[index]) && !_.isUndefined(request.params.temp[index]))) {
					Parse.Cloud.run('deleteFile', { 'useMasterKey': true, 'url': request.params.temp[index] });
				}
			}
		}
	}
});

Parse.Cloud.define('getRateMedia', async (request) => {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  }else{

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		let resultJson = { count: 0, items: [] };
		let UserMediaRating = Parse.Object.extend('UserMediaRating');
		var query;

		var MediaObject = Parse.Object.extend("Media");
		var innerMediaQuery = new Parse.Query(MediaObject);
		innerMediaQuery.equalTo('type', request.params.type);
		if (request.params.category) {
			innerMediaQuery.equalTo('category', { __type: 'Pointer', className: 'Category', objectId: request.params.category });
		}

		var query1 = new Parse.Query(UserMediaRating);

		if (request.params.query) {
			innerMediaQuery.matches('name', new RegExp(request.params.query, 'gi'));
		}

		query1.matchesQuery('media', innerMediaQuery);

		if (request.params.query) {
			var innerMediaQuery2 = new Parse.Query(MediaObject);
			innerMediaQuery2.equalTo('type', request.params.type);
			
			if (request.params.category) {
				innerMediaQuery2.equalTo('category', { __type: 'Pointer', className: 'Category', objectId: request.params.category });
			}

			var query2 = new Parse.Query(UserMediaRating);
			var UserObject = Parse.Object.extend("User");
			var innerUserQuery = new Parse.Query(UserObject);
			innerUserQuery.matches('fullname', new RegExp(request.params.query, 'gi'));
			query2.matchesQuery('user', innerUserQuery);
			query2.matchesQuery('media', innerMediaQuery2);

			query = Parse.Query.or(query1, query2);
		} else {
			query = query1;
		}

		query.include('user');
		query.include('media');
		query.include('media.category');

		query.limit(request.params.limit);
		query.skip(request.params.skip * request.params.limit);
		
		if (request.params.sortBy) {
			if (!request.params.descending) {
				query.ascending(request.params.sortBy);
			} else {
				query.descending(request.params.sortBy);
			}
		} else {
			query.descending('createdAt');
		}

		resultJson.count = await query.count();

		resultJson.items = await query.find()
			.then((results) => {
				return results;
			})
			.catch((e) => { throw e; });
		
		return resultJson;
  }
});

Parse.Cloud.define('getRateLesson', async (request) => {
	let currentUser = request.user;
  if (_.isNull(currentUser) || _.isUndefined(currentUser)) {
    throw 'Needs user to execute task.';
  }else{

		if (!currentUser.get('isAdmin')) {
			throw 'Precisa de usuário admin para executar a tarefa.';
		}

		let resultJson = { count: 0, items: [] };
		let UserMasterClassLessonRating = Parse.Object.extend('UserMasterClassLessonRating');
		let query;

		let userQuery = new Parse.Query(UserMasterClassLessonRating);
		let UserObject = Parse.Object.extend("User");
		let innerUserObjectQuery = new Parse.Query(UserObject);

		let lessonQuery = new Parse.Query(UserMasterClassLessonRating);
		let LessonObject = Parse.Object.extend("Lesson");
		let innerLessonObjectQuery = new Parse.Query(LessonObject);

		let classQuery = new Parse.Query(LessonObject);
		let ClassObject = Parse.Object.extend("Class");
		let innerClassObjectQuery = new Parse.Query(ClassObject);

		let moduleQuery = new Parse.Query(ClassObject);
		let ModuleObject = Parse.Object.extend("Module");
		let innerModuleObjectQuery = new Parse.Query(ModuleObject);

		if (request.params.query) {
			innerUserObjectQuery.matches('fullname', new RegExp(request.params.query, 'gi'));
			innerLessonObjectQuery.matches('name', new RegExp(request.params.query, 'gi'));
			innerClassObjectQuery.matches('name', new RegExp(request.params.query, 'gi'));
			innerModuleObjectQuery.matches('name', new RegExp(request.params.query, 'gi'));

			userQuery.matchesQuery('user', innerUserObjectQuery);
			lessonQuery.matchesQuery('lesson', innerLessonObjectQuery);
			if (request.params.category) {
				innerModuleObjectQuery.equalTo('category', { __type: 'Pointer', className: 'Category', objectId: request.params.category });
			}
			moduleQuery.matchesQuery('module', innerModuleObjectQuery);
			classQuery.matchesQuery('class', Parse.Query.or(innerClassObjectQuery, moduleQuery));
			lessonQuery.matchesQuery('lesson', classQuery);

			query = Parse.Query.or(userQuery, lessonQuery);
		} else {
			if (request.params.category) {
				innerModuleObjectQuery.equalTo('category', { __type: 'Pointer', className: 'Category', objectId: request.params.category });
			}
			moduleQuery.matchesQuery('module', innerModuleObjectQuery);
			classQuery.matchesQuery('class', moduleQuery);
			lessonQuery.matchesQuery('lesson', classQuery);
			query = Parse.Query.or(lessonQuery);
		}
		
		query.include('user');
		query.include('lesson');
		query.include('lesson.class');
		query.include('lesson.class.module');
		query.include('lesson.class.module.category');

		query.limit(request.params.limit);
		query.skip(request.params.skip * request.params.limit);
		
		if (request.params.sortBy) {
			if (!request.params.descending) {
				query.ascending(request.params.sortBy);
			} else {
				query.descending(request.params.sortBy);
			}
		} else {
			query.descending('createdAt');
		}

		resultJson.count = await query.count();

		resultJson.items = await query.find()
			.then((results) => {
				return results;
			})
			.catch((e) => { throw e; });
		
		return resultJson;
  }
});