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

