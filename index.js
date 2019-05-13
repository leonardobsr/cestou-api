const config = require('./config/env-variables');

var fs = require('fs');
var express = require('express');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var path = require('path');

var server = null;

var fileAdapter = undefined;
var mailAdapter = undefined;

if(config.file_adapter.on){
  
  let FSFilesAdapter = require('parse-server-fs-adapter');
  let fsAdapter = new FSFilesAdapter({
    "filesSubDirectory": config.file_adapter.root_folder
  });

  fileAdapter = fsAdapter;
}else if(config.s3_file_adapter.on){
  
  let S3Adapter = require('parse-server-s3-adapter');
  let s3Adapter = new S3Adapter(
    config.s3_file_adapter.accesskey,
    config.s3_file_adapter.secretkey,
    bucket, {
      region: config.s3_file_adapter.bucket.region,
      bucketPrefix: config.s3_file_adapter.bucket.prefix,
      directAccess: config.s3_file_adapter.bucket.direct_access,
      baseUrl: config.s3_file_adapter.bucket.base_url,
      signatureVersion: config.s3_file_adapter.bucket.signature_version,
      globalCacheControl: config.s3_file_adapter.bucket.global_cache_control
    }
  );

  fileAdapter = s3Adapter;
}

if(config.mail_adapter.on){
  
  let mailGunAdapter = {
    module: 'parse-server-simple-mailgun-adapter',
    options: {
      fromAddress: config.mail_adapter.from_address,
      domain: config.mail_adapter.domain,
      apiKey: config.mail_adapter.api_key,
    }
  }

  mailAdapter = mailGunAdapter; 
}

var apiV1 = new ParseServer({
  databaseURI: config.parse_server.database_uri,
  cloud: __dirname + config.parse_server.cloud_code_main,
  appId: config.parse_server.application_id,
  masterKey: config.parse_server.master_key,
  restAPIKey: config.parse_server.rest_api_key,
  javascriptKey: config.parse_server.javascript_key,
  serverURL: config.parse_server.url,
  publicServerURL: config.parse_server.url,
  verbose: config.parse_server.verbose,
  verifyUserEmails: config.parse_server.verifyUserEmails,
  accountLockout: config.parse_server.accountLockout,
  filesAdapter: fileAdapter,
  appName: config.parse_server.name,
  emailAdapter: mailAdapter,
  // push: {
  //   ios: [
  //     {
  //       pfx: './certificates/MinhaVanP12Dist.p12',
  //       bundleId: 'com.br.minhavan',
  //       production: true
  //     },
  //     {
  //       pfx: './certificates/MinhaVanp12Dev.p12',
  //       bundleId: 'com.br.minhavan',
  //       production: false
  //     }
  //   ]
  // },
  liveQuery: {
    classNames: config.parse_server.livequery.classNames
  }
});

var allowInsecureHTTP = (config.parse_server.https)? false : true ;
var dashboard = new ParseDashboard({
  "apps": [
    {
      appId: config.parse_server.application_id,
      masterKey: config.parse_server.master_key,
      javascriptKey: config.parse_server.javascript_key,
      serverURL: config.parse_server.url,
      appName: config.parse_server.name
    }
  ],
  "trustProxy": 1,
  "users": [
    {
      "user": config.parse_server.user,
      "pass": config.parse_server.pass
    }
  ]
},allowInsecureHTTP);

var app = express();

// Serve the Parse API on the /parse URL prefix
app.use(config.parse_server.mount, apiV1);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

// Serve the Parse API on the /dashboard
app.use('/dashboard/', dashboard);

if(config.parse_server.https){
  var options = {
    cert: fs.readFileSync(config.parse_server.cert.public, 'utf8'),
    key: fs.readFileSync(config.parse_server.cert.private, 'utf8')
  };
  server = require('https').createServer(options, app);
  console.log('Server running on https.');
}else{
  server = require('http').createServer(app);
  console.log('Server running on http.');
}

server.listen(config.parse_server.port, function() {
  console.log('Server running on port ' + config.parse_server.port + '.');
});

//This will enable the Live Query real-time server
if(config.parse_server.livequery.on){
  ParseServer.createLiveQueryServer(server);
}