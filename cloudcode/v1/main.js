const _ = require ('underscore');
const helper = require ('./helpers.js');
require ('./triggers.js');

Parse.Cloud.define('getVersion', async function() {
	return await helper.getVersion();
});

Parse.Cloud.define('saveShopping', async function(request){
	let currentUser = request.user;
	if (currentUser.id == null || currentUser.id == undefined) {
	  throw 'Needs user to execute task.';
	}else{
	  let objectsToSave = [];
	  let shoppingDate = new Date(request.params.date);
	
		let balance = await helper.getBalanceByUserYearMonth(currentUser,shoppingDate.getFullYear(), shoppingDate.getMonth());
		if (!balance) {
			let Balance = Parse.Object.extend('Balance');
			balance = new Balance();
			balance.set('user', currentUser);
			balance.set('year', shoppingDate.getFullYear());
			balance.set('month', shoppingDate.getMonth());
		}

		let marketplace = await helper.getMarketplaceByStateRegistrationCnpj(request.params.marketplace.stateRegistration, request.params.marketplace.cnpj);
		if (!marketplace) {
			let Marketplace = Parse.Object.extend('Marketplace');
			marketplace = new Marketplace();
			marketplace.set('stateRegistration', request.params.marketplace.stateRegistration);
			marketplace.set('cnpj', request.params.marketplace.cnpj);
			marketplace.set('name', request.params.marketplace.name);
			marketplace.set('address', request.params.marketplace.address);
			objectsToSave.push(marketplace);	
		}

		let shopping = await helper.getShoppingByAccessKey(request.params.accessKey);
		if (!shopping) {
			let Shopping = Parse.Object.extend('Shopping');
			shopping = new Shopping();
			shopping.set('balance', balance);
			shopping.set('marketplace', marketplace);
			shopping.set('accessKey', request.params.accessKey);
			shopping.set('date', { __type: 'Date', 'iso': request.params.date });
			shopping.set('cost', request.params.cost);
	  	objectsToSave.push(shopping);
		} else {
			throw "Error: Shopping has exists!";
		}
 
	  for (let index = 0; index < request.params.products.length; index++) {
			let productCategory = await helper.getProductCategoryByName(request.params.products[index].productCategory.name);
			if (!productCategory) {
				let ProductCategory = Parse.Object.extend('ProductCategory');
				productCategory = new ProductCategory();
				productCategory.set('name', request.params.products[index].productCategory.name);
				objectsToSave.push(productCategory);
			}

			let product = await helper.getProductByMarketplaceMarketplaceCode(marketplace, request.params.products[index].marketplaceCode);
			if (!product) {
				let Product = Parse.Object.extend('Product');
				product = new Product();
				product.set('marketplace', marketplace);
				product.set('marketplaceCode', request.params.products[index].marketplaceCode);
				product.set('name', request.params.products[index].name);
				product.set('productCategory', productCategory);
				objectsToSave.push(product);
			}
			
			let productHistory = await helper.getproductHistoryByShoppingProduct(shopping, product);
			if (!productHistory) {
				let ProductHistory = Parse.Object.extend('ProductHistory');
				productHistory = new ProductHistory();
				productHistory.set('shopping', shopping);
				productHistory.set('product', product);
				productHistory.set('valueUnit', request.params.products[index].unitPrice);
				productHistory.set('quantity', request.params.products[index].quantity);
				productHistory.set('unit', request.params.products[index].unit);
				objectsToSave.push(productHistory);
			}
	  }
		
		balance.set('expense', balance.get('expense') + request.params.cost);
		objectsToSave.push(balance);

	  return Parse.Object.saveAll(objectsToSave)
			.then(function(result) {
				return result;
			}, function(error) {
				throw "Error: " + error.code + " " + error.message;
			}
	  );
	}
});

Parse.Cloud.define('saveBalance', async function(request){
	let currentUser = request.user;
	if (currentUser.id == null || currentUser.id == undefined) {
		throw 'Needs user to execute task.';
	}else{

		let balanceDate = new Date();
		let Balance = Parse.Object.extend('Balance');
		
		let objectsToSave = [];
		for (let index = 0; index < 12; index++) {
			balance = new Balance();
			balance.set('user', { __type: 'Pointer', className: '_User', objectId: currentUser.id })
			balance.set('year', balanceDate.getFullYear());
			balance.set('month', index);
			balance.set('incoming', (request.params.incoming) ? request.params.incoming : 0);
			balance.set('expense', (request.params.expense) ? request.params.expense : 0);
			balance.set('expenseProjected', (request.params.expenseProjected) ? request.params.expenseProjected : 0);
			objectsToSave.push(balance);
		}

		return Parse.Object.saveAll(objectsToSave)
			.then(function(result) {
				return result;
			}, function(error) {
				throw "Error: " + error.code + " " + error.message;
			}
	  	); 
	}
});

Parse.Cloud.define('balances', async function(request){
	let currentUser = request.user;
	if (currentUser.id == null || currentUser.id == undefined) {
		throw 'Needs user to execute task.';
	}else{

		let Balance = Parse.Object.extend('Balance');
		let query = new Parse.Query(Balance);

		query.equalTo('user', currentUser);
    query.equalTo('year', request.params.year);
    query.ascending('month');
    query.limit(12);

		return await query.find()
			.then(async (results) => {
				if (results) {
					let resultsJson = [];
					await Promise.all(results.map(async (balance) => {
						let balanceJson = balance.toJSON();
            balanceJson.monthlyShoppings = [];
            
						await helper.getShoppingByBalance(balance.id)
							.then(async (results) => {
								if (results.length > 0) {
                  await Promise.all(results.map(async (shopping) => {
										let shoppingJson = shopping.toJSON();
										shoppingJson.date = shoppingJson.date.iso;
                    shoppingJson.products = [];

                    await helper.getProductHistoryByShopping(shopping.id)
                      .then(async (results) => {
                        if (results.length > 0) {
                          await Promise.all(results.map(async (productHistory) => {
														let productHistoryJson = productHistory.toJSON();
														let productJson = productHistoryJson.product;
														productHistoryJson.shopping = undefined;
														productHistoryJson.product = undefined;
														// productJson.productHistory = [];
														productJson.quantity = productHistoryJson.quantity;
														productJson.unit = productHistoryJson.unit;
														productJson.unitPrice = productHistoryJson.valueUnit;
														// productJson.productHistory.push(productHistoryJson);
                            shoppingJson.products.push(productJson);
                          }));
                        }
                      })
                      .catch((e) => { throw e; });

											balanceJson.monthlyShoppings.push(shoppingJson);
                  }));
								}
							})
              .catch((e) => { throw e; });
              
						resultsJson.push(balanceJson);
          }));
          
          for (let index = 0; index < resultsJson.length; index++) {
            resultsJson[index].monthlyShoppings.sort(function(a,b){
              if (a.date.iso > b.date.iso) return -1;
              if (a.date.iso < b.date.iso) return 1;
            });
          }
					
					return resultsJson.sort(function(a,b){
						if (a.month < b.month) return -1;
            if (a.month > b.month) return 1;
					});
				}
			})
			.catch((e) => { throw e; });
	}
});
