const config = {
	env: 'development',
	user: 'Mocka',
	pass: 'cestou',
	file_adapter: {
		on: true,
		root_folder: './files'
	},
	s3_file_adapter: {
		on: false,
		accesskey: 'accessKey',
		secretkey: 'secretKey',
		bucket: {
			region: 'us-east-1',
			prefix: '',
			direct_access: false,
			base_url: 'http://images.example.com',
			signature_version: 'v4',
			global_cache_control: 'public, max-age=86400'
		}
	},
	mail_adapter: {
		on: true,
		from_address: 'mailgun@sandbox8a90d98c557644938b84ad79981563c0.mailgun.org',
		domain: 'sandbox8a90d98c557644938b84ad79981563c0.mailgun.org',
		api_key: 'key-35c55944d59b804108086e18f6f2450b'
	},
	verbose: true,
	port: 7114,
	https: false,
	cert: {
		public: '/cert/',
		private: '/cert/'
	},
	livequery: {
		on: false,
		classNames: []
	},
	verifyUserEmails: false,
	accountLockout: undefined, //{duration: 15,threshold: 5}
	versions: [
		{
			parse_server: {
				name: 'Cestou - v1',
				application_id: 'BUocb5yrgLRYaBj6MAJv79lnkjupls9U1tZXwK74',
                master_key: 'cM9r436LLhA5wlzS2r1e07jGjKXDeCXIKLx0Dbwy',
                rest_api_key: 'fhqaBdHbm66HuuVirZX4lAdtTCQEGOyRTEqIGkJm',
                javascript_key: 'hsFCvGMF3BJAB3uFbHKI6IZtD2LLOuknlfAsSIeO',
				database_uri: 'mongodb://cestou:C35t0u1429318295@127.0.0.1:25012/cestou',
				mount: '/parse',
				cloud_code_main: '/cloudcode/v1/main.js',
				url: 'http://127.0.0.1:7114/parse',
				maxUploadSize: '100mb'
			}
		}
	]
}

module.exports = config;
