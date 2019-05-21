const _ = require ('underscore');

module.exports = {
	getBalanceByUserYearMonth: async function(user, year, month) {
		let Balance = Parse.Object.extend('Balance');
		let query = new Parse.Query(Balance);

    query.equalTo("user", user);
    query.equalTo("year", year);
    query.equalTo("month", month);

		return await query.first()
			.then((resp) => {
				return resp;
			})
			.catch((e) => { throw e; });
  },
  getMarketplaceByStateRegistrationCnpj: async function(stateRegistration, cnpj) {
		let Marketplace = Parse.Object.extend('Marketplace');
		let query = new Parse.Query(Marketplace);

    query.equalTo("stateRegistration", stateRegistration);
    query.equalTo("cnpj", cnpj);

		return await query.first()
			.then((resp) => {
				return resp;
			})
			.catch((e) => { throw e; });
  },
  getShoppingByAccessKey: async function(accessKey) {
		let Shopping = Parse.Object.extend('Shopping');
		let query = new Parse.Query(Shopping);

    query.equalTo("accessKey", accessKey);

		return await query.first()
			.then((resp) => {
				return resp;
			})
			.catch((e) => { throw e; });
  },
  getProductCategoryByName: async function(name) {
    let ProductCategory = Parse.Object.extend('ProductCategory');
		let query = new Parse.Query(ProductCategory);

    query.equalTo("name", name);

		return await query.first()
			.then((resp) => {
				return resp;
			})
			.catch((e) => { throw e; });
  },
  getProductByMarketplaceMarketplaceCode: async function(marketplace, marketplaceCode) {
    let Product = Parse.Object.extend('Product');
		let query = new Parse.Query(Product);

    if(marketplace.id) query.equalTo("marketplace", marketplace);
    query.equalTo("marketplaceCode", marketplaceCode);

		return await query.first()
			.then((resp) => {
				return resp;
			})
			.catch((e) => { throw e; });
  },
	getproductHistoryByShoppingProduct: async function(shopping, product) {
    let ProductHistory = Parse.Object.extend('ProductHistory');
		let query = new Parse.Query(ProductHistory);

    if(shopping.id || product.id) {
      if(shopping.id) query.equalTo("shopping", shopping);
      if(product.id) query.equalTo("product", product);

      return await query.first()
        .then((resp) => {
          return resp;
        })
        .catch((e) => { throw e; });
    } else {
      return null;
    }
	},
	getShoppingByBalance: async function(objectId) {
		let Shopping = Parse.Object.extend('Shopping');
		let query = new Parse.Query(Shopping);

		query.equalTo('balance', { __type: 'Pointer', className: 'Balance', objectId: objectId });
		query.include('marketplace');
		
		return query.find()
			.then((resp) => {
				return resp;
			})
			.catch((e) => { throw e; });
	},
	getProductHistoryByShopping: async function(objectId) {
		let ProductHistory = Parse.Object.extend('ProductHistory');
		let query = new Parse.Query(ProductHistory);

		query.equalTo('shopping', { __type: 'Pointer', className: 'Shopping', objectId: objectId });
		query.include('product');
		query.include('product.productCategory');

		return query.find()
			.then((resp) => {
				return resp;
			})
			.catch((e) => { throw e; });
	}
}