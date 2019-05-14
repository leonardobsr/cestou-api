const _ = require ('underscore');
const helper = require ('./helpers.js');
const config = require('../../config/env-variables');
require ('./triggers.js');

Parse.Cloud.define('getVersion', function() {
	return 'v1';
});

Parse.Cloud.define('saveShopping', async function(request, response){
	let currentUser = request.user;
	if (currentUser.id == null || currentUser.id == undefined) {
	  throw 'Needs user to execute task.';
	}else{
	  let objectsToSave = [];
	  let shoppingDate = new Date(request.params.date);
  
	  let Balance = Parse.Object.extend('Balance');
	  balance = new Balance();
	  balance.set('user', { __type: 'Pointer', className: '_User', objectId: currentUser.id })
	  balance.set('year', shoppingDate.getFullYear());
	  balance.set('month', shoppingDate.getMonth() + 1);
  
	  let Marketplace = Parse.Object.extend('Marketplace');
	  let marketplace = new Marketplace();
	  marketplace.set('stateRegistration', request.params.marketplace.stateRegistration);
	  marketplace.set('cnpj', request.params.marketplace.cnpj);
	  marketplace.set('name', request.params.marketplace.name);
	  marketplace.set('address', request.params.marketplace.address);
	  objectsToSave.push(marketplace);
  
	  let Shopping = Parse.Object.extend('Shopping');
	  let shopping = new Shopping();
	  shopping.set('balance', balance);
	  shopping.set('marketplace', marketplace);
	  shopping.set('accessKey', request.params.accessKey);
	  shopping.set('date', { __type: 'Date', 'iso': request.params.date });
  
  
	  let shoppingExpense = 0;
	  for (let index = 0; index < request.params.products.length; index++) {
		let Product = Parse.Object.extend('Product');
		let product = new Product();
		product.set('marketplace', marketplace);
		product.set('marketplaceCode', request.params.products[index].code);
		product.set('name', request.params.products[index].name);
		product.set('productCategory', { __type: 'Pointer', className: 'ProductCategory', objectId: "uWlp9ufK8S" });
		objectsToSave.push(product);
  
		shoppingExpense += request.params.products[index].unitPrice * request.params.products[index].quantity;
  
		let ProductHistory = Parse.Object.extend('ProductHistory');
		let productHistory = new ProductHistory();
		productHistory.set('shopping', shopping);
		productHistory.set('product', product);
		productHistory.set('valueUnit', request.params.products[index].unitPrice);
		productHistory.set('quantity', request.params.products[index].quantity);
		productHistory.set('unity', request.params.products[index].unity);
		objectsToSave.push(productHistory);
	  }
	  
	  balance.set('expense', shoppingExpense);
	  objectsToSave.push(balance);
  
	  shopping.set('cost', shoppingExpense);
	  objectsToSave.push(shopping);
  
	  Parse.Object.saveAll(objectsToSave)
		.then(function(result) {
		  response.success(result);
		}, function(error) {
		  response.error("Error: " + error.code + " " + error.message);
		}
	  ); 
	}
  });
  
  Parse.Cloud.define('getBalance', function(request, response){
	let currentUser = request.user;
	if (currentUser.id == null || currentUser.id == undefined) {
	  throw 'Needs user to execute task.';
	}else{
  
	  let Balance = Parse.Object.extend('Balance');
	  let query = new Parse.Query(Balance);
  
	  query.equalTo('user', { __type: 'Pointer', className: '_User', objectId: currentUser.id });
	  
	  if (request.params.year) {
		query.equalTo('year', request.params.year);
	  }
  
	  if (request.params.month) {
		query.equalTo('month', request.params.month);
	  }
  
	  if (request.params.skip && request.params.limit) {
		query.limit(request.params.limit);
			query.skip(request.params.skip * request.params.limit);
	  }
  
	  query.find()
		.then((balances) => {
		  response.success(balances);
		})
		.catch((error) => {
		  response.error('Failed, with error code: ' + error.message);
		});
	}
  });
  
  Parse.Cloud.define('saveBalance', async function(request, response){
	let currentUser = request.user;
	if (currentUser.id == null || currentUser.id == undefined) {
	  throw 'Needs user to execute task.';
	}else{
  
	  let balanceDate = new Date();
	  let Balance = Parse.Object.extend('Balance');
	  balance = new Balance();
	  balance.set('user', { __type: 'Pointer', className: '_User', objectId: currentUser.id })
	  balance.set('year', balanceDate.getFullYear());
	  balance.set('month', balanceDate.getMonth() + 1);
	  balance.set('incoming', (request.params.incoming) ? request.params.incoming : 0);
	  balance.set('expense', (request.params.expense) ? request.params.expense : 0);
	  balance.set('expenseProjected', (request.params.expenseProjected) ? request.params.expenseProjected : 0);
  
	  balance.save()
		.then(function(result) {
		  response.success(result);
		}, function(error) {
		  response.error("Error: " + error.code + " " + error.message);
		}
	  ); 
	}
  });
  
  // remove shopping
  