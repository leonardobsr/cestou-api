const _ = require ('underscore');
const helpers = require ('./helpers.js');

Parse.Cloud.beforeSave("Balance", async function (request) {
  if (request.object.isNew()) {
    let Balance = Parse.Object.extend("Balance");
    let query = new Parse.Query(Balance);
    query.equalTo("user", request.object.get('user'));
    query.equalTo("year", request.object.get('year'));
    query.equalTo("month", request.object.get('month'));
    return await query.first({
      success: function(object) {
        if (!object) {
          object = request.object.save();
        } else {
          object.set("expense", request.object.get('expense'));
        }
        return object;
      },
      error: function(error) {
        throw "Error: " + error.code + " " + error.message;
      }
    });
  }
});

// Parse.Cloud.beforeSave("Marketplace", function (request, response) {
//   var object = request.object;
//   if (!object.id) {
//     // this is a new object
//   }
// });

// Parse.Cloud.beforeSave("Shopping", function (request, response) {
//   var object = request.object;
//   if (!object.id) {
//      // this is a new object
//   }
// });

// Parse.Cloud.beforeSave("Product", function (request, response) {
//   var object = request.object;
//   if (!object.id) {
//      // this is a new object
//   }
// });

// Parse.Cloud.beforeSave("ProductHistory", function (request, response) {
//   var object = request.object;
//   if (!object.id) {
//      // this is a new object
//   }
// });