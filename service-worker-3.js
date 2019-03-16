var VERSION = 'V8';
var cacheName = 'pwa ' + VERSION;
var verbose = false;


var handlers = {
	activated: function (event) {
		console.log('#### PWA activated!');
	},
	message: function (event) {
		console.log("PWA Received Message: " + event.data + ' ' + event.source);
	},
	install: function (event) {
		console.log("PWA ON INSTALL");
		// // qui potrei caricare ciò che voglio
		// event.waitUntil(
		// 	caches.open(cacheName).then(function (cache) {
		// 		return cache.addAll([	'index.html' /* ETC... */]);
		// 	})
		// );
	},

	fetch: function (event) {
		applyStrategy(event);
	}
}

function applyStrategy(event) {
	const nf = "paolo-hp-notes.html,pwa.js,notes.js,note-category.js,cognito,index.html".split(',');
	const no = [];
	
	function choose() {
		if (event.request.method != 'GET')
			return netOnly;

		for (var i = 0; i < nf.length; i++)
			if (event.request.url.indexOf(nf[i]) >= 0)
				return netFirst;

		for (var i = 0; i < no.length; i++)
			if (event.request.url.indexOf(no[i]) >= 0)
				return netOnly;

		return cacheFirst;
	}

	function netFirst() {
		var fetchRequest = event.request.clone();
		var esito = '';

		function onFetchSuccess(response) {
			if (response.status == 200) {
				esito = 'netOk';
				return cache.put(event.request, response);
			}
			else {
				esito = 'netNotFound';
				return cache.get(event.request).catch(function () { return response; });
			}
		}

		function onFetchFailure(error) {
			esito = 'netFail';
			console.log('error: ' + error);
			var x = cache.get(event.request).catch(function () {
				return response;
			});
			return x;
		}

		var promise = fetch(fetchRequest).then(onFetchSuccess, onFetchFailure);
		event.respondWith(promise);
		promise.then(function () {
			console.log("NETFIRST " + esito + ": " + event.request.method + " " + event.request.url);
		});
		return promise;
	}

	function netOnly() {
		var fetchRequest = event.request.clone();
		var promise = fetch(fetchRequest);
		event.respondWith(promise);
		promise.then(
			function () {
				console.log("NETONLY ok: " + event.request.method + " " + event.request.url);
			},
			function () {
				console.log("NETONLY FAIL: " + event.request.method + " " + event.request.url);
			}
		);

		return promise;
	}

	function cacheFirst() {
		var cacheRequest = event.request.clone();
		var h = '';
		var promise = new Promise(function (resolve, reject) {
			var cachePromise = cache.get(event.request, console.log);
			cachePromise.then(
				function (x) {
					h = h + 'cacheFound ';
					resolve(x);
				},
				function (err) {
					h = h + 'cacheErr ';
					function onNetResponse(response) {
						h = h + 'netOk ';
						cache.put(cacheRequest, response);
						resolve(response);
					}
					function onNetFail() {
						h = h + 'netFail ';
						reject();
					}
					return fetch(event.request).then(onNetResponse, onNetFail);
				});
		});
		event.respondWith(promise);
		promise.then(
			function () {
				if (h != 'cacheFound ')
					console.log("CACHEFIRST " + h.trim() + ": " + event.request.method + " " + event.request.url);
			},
			function () {
				console.log("CACHEFIRST fail " + h.trim() + ": " + event.request.method + " " + event.request.url);
			}
		);
		return promise;
	}

	choose()();
}


var cache = {
	get: function (request) {
		var cacheRequest = request.clone();
		var cachePromise = caches.open(cacheName).then(function (cache) {
			function onMatching(matching) {
				var fail = !matching || matching.status == 404;
				var report = fail
					? Promise.reject('no-match')
					: matching;
				return report;
			}

			function onErr(err) {
				console.log({ err: err });
				return Promise.reject('match-error');
			}

			var matchPromise = cache.match(cacheRequest).then(onMatching, onErr);
			return matchPromise;
		});
		return cachePromise;
	},

	put: function (request, response) {
		var cacheRequest = request.clone();
		var cacheResponse = response.clone();
		var cachePromise = caches.open(cacheName).then(function (cache) {
			var r = cache.put(cacheRequest, cacheResponse)
				.then(
					function () { return response; },
					function () { return response; }
				);
			return r;
		});
		return cachePromise;
	}


}

function doInit() {
	return new Promise(function (resolve, reject) {
		self.addEventListener('install', handlers.install);
		self.addEventListener('fetch', handlers.fetch);
		self.addEventListener('activate', handlers.activated);
		self.addEventListener('message', handlers.message);

		var x = location.href.split('?')[1];
		if (x) {
			x.split('&').map(function (kv) {
				[key, value] = kv.split('=');
				if (key == 'version')
					VERSION = value;
			});
		}
		cacheName = 'pwaCache.' + VERSION;
		console.log("#### PWA Cervice worker VERSION=" + VERSION + " cacheName=" + cacheName + ' ###');
		resolve();
	});
}

var init = doInit();
