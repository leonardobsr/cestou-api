const config = require('./config/env-variables');
const _ = require ('underscore');

var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var ParseServer = require('parse-server').ParseServer;
var ParseDashboard = require('parse-dashboard');
var S3Adapter = require("@parse/s3-files-adapter");
var AWS = require("aws-sdk");

var app = express();
app.use(bodyParser.json({limit: "100mb"}));
app.use(bodyParser.urlencoded({limit: "100mb", extended: true, parameterLimit: 100000}));

var apps = [];
var server = null;

var fileAdapter = undefined;
var mailAdapter = undefined;

if(config.file_adapter.on){

  let FSFilesAdapter = require('@parse/fs-files-adapter');
  let fsAdapter = new FSFilesAdapter({
    "filesSubDirectory": config.file_adapter.root_folder
  });

  fileAdapter = fsAdapter;
} else if(config.s3_file_adapter.on){
  //Configure Digital Ocean Spaces EndPoint
  const spacesEndpoint = new AWS.Endpoint("sfo2.digitaloceanspaces.com");
  var s3Options = {
    bucket: "meditamais",
    baseUrl: "https://meditamais.sfo2.digitaloceanspaces.com", 
    region: "sfo2",
    directAccess: true,
    globalCacheControl: "public, max-age=31536000", 
    bucketPrefix: "appFiles/",
    s3overrides: {
      accessKeyId: "MGODMYYQNNRLO3SOEVZ2",
      secretAccessKey: "UYQ4cd+/iHQdx5PDbDDQCOTW/VvOaza+0j35toPR0Os",
      endpoint: spacesEndpoint
    }
  };

  fileAdapter = new S3Adapter(s3Options);
}

if(config.mail_adapter.on){

  let mailGunAdapter = {
    module: '@parse/simple-mailgun-adapter',
    options: {
      fromAddress: config.mail_adapter.from_address,
      domain: config.mail_adapter.domain,
      apiKey: config.mail_adapter.api_key,
    }
  }

  mailAdapter = mailGunAdapter;
}

_.each(config.versions, function(version){

  apps.push(
    {
      appId: version.parse_server.application_id,
      masterKey: version.parse_server.master_key,
      javascriptKey: version.parse_server.javascript_key,
      serverURL: version.parse_server.url,
      appName: version.parse_server.name
    }
  );

  var api = new ParseServer({
    databaseURI: version.parse_server.database_uri,
    cloud: __dirname + version.parse_server.cloud_code_main,
    appId: version.parse_server.application_id,
    masterKey: version.parse_server.master_key,
    restAPIKey: version.parse_server.rest_api_key,
    javascriptKey: version.parse_server.javascript_key,
    serverURL: version.parse_server.url,
    publicServerURL: version.parse_server.url,
    verbose: config.verbose,
    logLevel: 3,
    verifyUserEmails: config.verifyUserEmails,
    accountLockout: config.accountLockout,
    filesAdapter: fileAdapter,
    appName: version.parse_server.name,
    emailAdapter: mailAdapter,
    maxUploadSize: version.parse_server.maxUploadSize,
    // push: {
    //   ios: [
    //     {
    //       pfx: './certificates/xxxxxxx.p12',
    //       bundleId: 'xxxxxxx',
    //       production: true
    //     },
    //     {
    //       pfx: './certificates/xxxxxxx.p12',
    //       bundleId: 'xxxxxxx',
    //       production: false
    //     }
    //   ]
    // },
    liveQuery: {
      classNames: config.livequery.classNames
    }
  });

  // Serve the Parse API on the /parse URL prefix
  app.use(version.parse_server.mount, api);
});

var allowInsecureHTTP = (config.https)? false : true ;
var dashboard = new ParseDashboard({
  "apps": apps,
  "trustProxy": 1,
  "users": [
    {
      "user": config.user,
      "pass": config.pass
    }
  ]
},allowInsecureHTTP);

// Parse Server plays nicely with the rest of your web routes
app.get('/', function(req, res) {
  res.status(200).send('I dream of being a website.  Please star the parse-server repo on GitHub!');
});

// Serve the Parse API on the /dashboard
app.use('/dashboard/', dashboard);

if(config.https){
  var options = {
    cert: fs.readFileSync(config.cert.public, 'utf8'),
    key: fs.readFileSync(config.cert.private, 'utf8')
  };
  server = require('https').createServer(options, app);
  console.log('Server running on https.');
}else{
  server = require('http').createServer(app);
  console.log('Server running on http.');
}

server.listen(config.port, function() {
  console.log('Server running on port ' + config.port + '.');
});

//This will enable the Live Query real-time server
if(config.livequery.on){
  ParseServer.createLiveQueryServer(server);
}
