
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

			let refs = [];

			_fs.readdirSync(path + '/refs/remotes/' + name)
				// .filter(ref => ref !== 'HEAD')
				.map(ref => [
					ref,
					_fs.readFileSync(path + '/refs/remotes/' + name + '/' + ref).toString('utf8').trim()
				])
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

		let stdout = data.stdout.toString('utf8');
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

						case 'M ':
						case 'A ':
						case 'R ':
						case 'C ':
							state = 'index-and-work-tree-matches';
							break;

						case ' M':
						case 'MM':
						case 'AM':
						case 'RM':
						case 'CM':
							state = 'work-tree-changed-since-index';
							break;

						case ' D':
						case 'MD':
						case 'AD':
						case 'RD':
						case 'CD':
							state = 'deleted-in-work-tree';
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
