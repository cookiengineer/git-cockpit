
(function(global) {

	const _fs     = require('fs');
	const _http   = require('http');
	const _path   = require('path');
	const _CACHE  = {};
	const _PUBLIC = _path.resolve(__dirname, '../design'); // dirname is /build
	const _MIME   = {
		'css':  'text/css',
		'html': 'text/html',
		'json': 'application/json'
	};



	/*
	 * HELPERS
	 */

	const _get_headers = function(url, buffer) {

		let ext  = url.split('.').pop();
		let mime = _MIME[ext] || 'text/plain';

		if (url.startsWith('/api')) {
			mime = _MIME['json'];
		}

		return {
			'Content-Type':   mime,
			'Content-Length': buffer.length
		};

	};

	const _serve_api = function(url, res) {

		if (url === '/api/status') {

			_GIT_COCKPIT.status(data => {

				let buffer = '[]';

				if (data !== null) {

					buffer = JSON.stringify(data);
					res.writeHead(200, _get_headers(url, buffer));
					res.write(buffer);
					res.end();

				} else {

					res.writeHead(500, _get_headers(url, buffer));
					res.write(buffer);
					res.end();

				}

			});

		} else {

			res.writeHead(404);
			res.write('API not found.');
			res.end();

		}

	};

	const _serve_file = function(url, res) {

		let buffer = _CACHE[url] || null;
		if (buffer !== null) {

			res.writeHead(200, _get_headers(url, buffer));
			res.write(buffer);
			res.end();

		} else {

			res.writeHead(404);
			res.write('File not found.');
			res.end();

		}

	};



	/*
	 * INITIALIZATION
	 */

	const server = _http.createServer((req, res) => {

		let url = req.url;
		if (url === '/') {
			url = '/index.html';
		}

		if (url.startsWith('/api/')) {

			_serve_api(url, res);

		} else if (_CACHE[url] !== undefined) {

			_serve_file(url, res);

		} else {

			res.writeHead(404);
			res.write('File not found.');
			res.end();

		}

		res.end();

	});

	server.on('clientError', (err, socket) => {
		socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
	});



	/*
	 * CACHE
	 */

	(function(cache) {

		_fs.readdir(_PUBLIC, (err, files) => {

			files.forEach(file => {

				let data = null;

				try {
					data = _fs.readFileSync(_PUBLIC + '/' + file);
				} catch (err) {
					data = null;
				}

				if (data !== null) {
					_CACHE['/' + file] = data;
				}

			});

		});

	})(_CACHE);

	server.listen(_GIT_COCKPIT.port);

	console.log('Listening on http://localhost:' + _GIT_COCKPIT.port);

})(typeof global !== 'undefined' ? global : this);

