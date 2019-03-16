var aws = (function () {
	var initialized = $.Deferred();

	function get(bucket, path, versionId) {
		console.log('getting '+bucket+":"+path);
		var ret = $.Deferred();
		getS3().then(function(s3){
			console.log('S3OK getting '+bucket+":"+path);
			var params = {
				Bucket: bucket,
				Key: path
			};
			if (versionId)
				params.VersionId = versionId;

			s3.getObject(params, function (err, data) {
				console.log({s3GetObject:{err:err,data:data}});
				if (err) 
					ret.reject(err);
				else if (data && data.Body)
					ret.resolve(data.Body.toString('utf-8'));
				else
					ret.reject(err);
			});	
		});
		return ret;
	}

	function listVersions(bucket, path) {

		var ret = $.Deferred();
		
		getS3().then(function(s3) {
			console.log('S3OK getting '+bucket+":"+path);
			var params = {
				Bucket: bucket,
				Prefix: path
			};
			s3.listObjectVersions(params, function(err, data) {
				if (err) {
					console.log(err, err.stack); // an error occurred
					ret.reject(err);
				}
				else {    
					 ret.resolve(data);           // successful response
				}
			});
		});
		return ret;
	}

	function put(bucket, path, textContent) {
		var ret = $.Deferred();

		var params = {
			Bucket: bucket,
			Key: path,
			Body: textContent
		};
		getS3().then(function(s3) {
			s3.putObject(params, function (err, data) {
				if (err)
					ret.reject(err);
				else
					ret.resolve();
			});
		});
		return ret;
	}

	function logIfError(err) {
		console.log({logIfError: this, args:arguments});
		console.log({ log_err: err}, err.stack); 
		return Promise.reject(err);
	}

	function getAWS() {
		if (!getAWS.promise) {
			console.log('AWS Init');

			var options =  {
				dataType: "script",
				cache: true,
				url: "https://sdk.amazonaws.com/js/aws-sdk-2.188.0.min.js"
			};
			getAWS.promise = $.ajax(options)
			.then(function( s, Status ) {
				console.warn( Status );
				return AWS;
			})
			.fail(function( jqxhr, settings, exception ) {
				console.warn( "Something went wrong"+exception );
			});
		}
		return getAWS.promise;
	}

	function getS3() {
		if (!getS3.promise) {
			getS3.promise = getAWS().then(function(AWS){
				AWS.config.region = 'us-east-1'; // Region
				AWS.config.credentials = new AWS.CognitoIdentityCredentials({
					IdentityPoolId: 'us-east-1:c285f882-330b-4113-9976-204f8d336cc5',
				});
				var s3 = new AWS.S3({ region: 'us-east-1' });
				return s3;
			});
		}
		return getS3.promise;
	}

	
	function prova() {
		var par = {Bucket: "hp-notes"};
		getS3().then(function(s3) { 
			return s3.listObjects(par, function(err, data) {
				if (err) 
					console.log(err, err.stack); // an error occurred
				else     
					console.log({awsData:data});           // successful response
			});
		});
	}

	prova();

	return {
		get: get,
		put: put,
		listVersions:listVersions
	};
})();

