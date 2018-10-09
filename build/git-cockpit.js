#!/usr/bin/env node

const _GIT_COCKPIT = {
	root:  '~/Software',
	port:  1337,
	repos: []
};



/*
 * CONFIG INTEGRATION
 */


(function(global, argv, cwd) {

	const _fs = require('fs');


	let root = _GIT_COCKPIT.root;
	let arg0 = typeof argv[0] === 'string' ? argv[0] : '';
	if (arg0 !== '' && arg0.startsWith('--') === false) {
		root = arg0;
	}

	if (root.startsWith('~/') && typeof process.env.HOME === 'string') {
		root = process.env.HOME + root.substr(1);
	}


	let port = 1337;

	argv.forEach((arg, a) => {

		if (arg.startsWith('--port=')) {

			let tmp = arg.split('=')[1];
			if (tmp.startsWith('"')) tmp = tmp.substr(1);
			if (tmp.endsWith('"'))   tmp = tmp.substr(0, tmp.length - 1);

			port = parseInt(tmp, 10);

		} else if (arg === '--port') {
			port = parseInt(argv[a + 1], 10);
		}

	});

	if (typeof port === 'number' && !isNaN(port)) {
		_GIT_COCKPIT.port = port;
	}


	_fs.readdir(root, (err, folders) => {

		if (!err && folders instanceof Array) {

			folders.forEach(folder => {

				if (_fs.existsSync(root + '/' + folder + '/.git')) {

					_GIT_COCKPIT.repos.push({
						name: folder,
						path: root + '/' + folder + '/.git'
					});

				}

				_fs.readdir(root + '/' + folder, (err, subfolders) => {

					if (!err && subfolders instanceof Array) {

						subfolders.forEach(subfolder => {

							if (_fs.existsSync(root + '/' + folder + '/' + subfolder + '/.git')) {

								_GIT_COCKPIT.repos.push({
									name: folder + '/' + subfolder,
									path: root + '/' + folder + '/' + subfolder + '/.git'
								});

							}

						});

					}

				});

			});

		} else {

			console.error('Could not read folder "' + root + '" (maybe no read access?)');

		}

	});

})(typeof global !== 'undefined' ? global : this, process.argv.slice(2), process.cwd());


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


(function(global) {

	const _child_process = require('child_process');
	const _fs            = require('fs');
	const _GIT_PATH      = '/usr/bin/git';



	/*
	 * HELPERS
	 */

	const _get_remotes = function(path) {

		let remotes = [];
		let names   = [];

		try {
			names = _fs.readdirSync(path + '/refs/remotes');
		} catch (err) {
		}

		names.forEach(name => {

			_fs.readdirSync(path + '/refs/remotes/' + name)
				.reduce((refs, ref) => {

					let ref_path     = path + '/refs/remotes/' + name + '/' + ref;
					let is_directory = _fs.lstatSync(ref_path).isDirectory();
					if (is_directory === false) {

						refs.push([
							ref,
							_fs.readFileSync(ref_path).toString('utf8').trim()
						]);

					} else {

						refs.push.apply(refs, _fs.readdirSync(ref_path).map(ref => [
							ref,
							_fs.readFileSync(ref_path + '/' + ref).toString('utf8').trim()
						]));

					}

					return refs;

				}, [])
				.forEach(ref => {

					remotes.push({
						path:   name + '/' + ref[0],
						branch: ref[0],
						hash:   ref[1]
					});

				});


			let head = remotes.find(r => r.path === 'origin/HEAD');
			if (head !== undefined) {

				let hash = head.hash;
				if (hash.startsWith('ref: refs/remotes/')) {

					let tmp = hash.substr(18);
					let other = remotes.find(r => r.path === tmp);
					if (other !== undefined) {
						other.hash === 'HEAD';
					}

				}

			}

		});

		return remotes;

	};

	const _get_status = function(path) {

		let status = [];

		let cwd = path;
		if (cwd.endsWith('/.git')) {
			cwd = cwd.substr(0, cwd.length - 5);
		}

		let data = _child_process.spawnSync(_GIT_PATH, [
			'status',
			'--porcelain'
		], {
			cwd: cwd
		});

		let stdout = (data.stdout || '').toString('utf8');
		if (stdout.length > 0) {

			stdout.split('\n').forEach(line => {

				if (line.trim() !== '') {

					let path  = line.substr(2).trim();
					let state = null;
					let mx    = line.charAt(0);
					let my    = line.charAt(1);
					let mod   = '' + mx + my;

					switch (mod) {

						case ' M':
						case ' D':
							state = 'not-updated';
							break;

						case 'M ':
						case 'MM':
						case 'MD':
							state = 'updated-in-index';
							break;

						case 'A ':
						case 'AM':
						case 'AD':
							state = 'added-to-index';
							break;

						case 'D ':
						case 'DM':
							state = 'deleted-from-index';
							break;

						case 'R ':
						case 'RM':
						case 'RD':
							state = 'renamed-in-index';
							break;

						case 'C ':
						case 'CM':
						case 'CD':
							state = 'copied-in-index';
							break;

						case 'DD':
						case 'AU':
						case 'UD':
						case 'UA':
						case 'DU':
						case 'AA':
						case 'UU':
							state = 'unmerged';
							break;

						case '??':
							state = 'untracked';
							break;

						case '!!':
							state = 'ignored';
							break;

					}


					if (state !== null && state !== 'ignored') {

						status.push({
							path:  path,
							xy:    '' + mx + my,
							state: state
						});

					}

				}

			});

		}


		return status;

	};


	_GIT_COCKPIT.status = function(callback) {

		let data = [];

		_GIT_COCKPIT.repos.forEach(repo => {

			let remotes = _get_remotes(repo.path);
			let status  = _get_status(repo.path);

			if (remotes.length === 0) {
				console.error('Repository "' + repo.name + '" has no remotes.');
			}

			data.push({
				name:    repo.name,
				path:    repo.path,
				status:  status,
				remotes: remotes
			});

		});

		callback(data);

	};

})(typeof global !== 'undefined' ? global : this);
