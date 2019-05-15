const _ = require ('underscore');
const helpers = require ('./helpers.js');

Parse.Cloud.beforeSave("Balance", function (request, response) {
  if (request.object.isNew()) {
    let Balance = Parse.Object.extend("Balance");
    let query = new Parse.Query(Balance);
    query.equalTo("user", request.object.get('user'));
    query.equalTo("year", request.object.get('year'));
    query.equalTo("month", request.object.get('month'));
    query.first({
      success: function(object) {
        if (!object) {
          object = request.object.save();
        }
        response.success(object);
      },
      error: function(error) {
        response.error("Error: " + error.code + " " + error.message);
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