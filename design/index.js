
/*
 * POLYFILLS
 */

if (typeof Array.prototype.unique !== 'function') {

	Array.prototype.unique = function() {

		if (this === null || this === undefined) {
			throw new TypeError('Array.prototype.unique called on null or undefined');
		}


		let clone  = [];
		let list   = Object(this);
		let length = this.length >>> 0;
		let value;

		for (let i = 0; i < length; i++) {

			value = list[i];

			if (clone.indexOf(value) === -1) {
				clone.push(value);
			}
		}

		return clone;

	};

}



(function(global) {

	const _document = global.document;
	const _fetch    = global.fetch;
	const _CACHE    = [];
	let   _FILTERS  = [];
	const _COUNT    = _document.querySelector('#repos-count');
	const _TABLE    = _document.querySelector('#repositories');



	/*
	 * HELPERS
	 */

	const _request_api = function(url, callback) {

		fetch(url)
			.then(response => response.json())
			.then(data => callback(data || null));

	};

	const _filter_repos = function(filters) {

		filters = filters instanceof Array ? filters : null;

		if (filters !== null) {
			_FILTERS = filters;
		}


		let count = 0;

		if (_FILTERS.length === 0) {

			_CACHE.forEach(entry => {

				let tmp   = entry.className.split(' ');
				let check = tmp.indexOf('hidden');
				if (check !== -1) {
					tmp.splice(check, 1);
					entry.className = tmp.join(' ');
				}

				count++;

			});

		} else {

			_CACHE.forEach(entry => {

				let tmp   = entry.className.split(' ');
				let check = tmp.indexOf('hidden');
				let found = tmp.find(cn => _FILTERS.includes(cn));
				if (found !== undefined) {

					if (check !== -1) {
						tmp.splice(check, 1);
					}

					count++;

				} else {

					if (check === -1) {
						tmp.push('hidden');
					}

				}

				entry.className = tmp.join(' ');

			});

		}


		_COUNT.innerHTML = count + ' / ' + _CACHE.length + ' repos';

	};

	const _reload_repos = function() {

		for (let c = 0, cl = _CACHE.length; c < cl; c++) {

			_TABLE.removeChild(_CACHE[c]);
			_CACHE.splice(c, 1);
			cl--;
			c--;

		}

		_request_api('/api/status', data => {

			if (data instanceof Array) {

				data.sort((a, b) => {
					if (a.name < b.name) return -1;
					if (a.name > b.name) return  1;
					return 0;
				}).map(entry => {

					let element = _document.createElement('tr');
					let classes = [];
					let html    = [];

					html.push('<th><a href="file://' + entry.path + '">' + entry.name + '</a></th>');
					if (entry.status.length > 0) {

						html.push('<td class="with-changelog">');
						classes.push('unsynced-changes');
						html.push('<div class="changelog">');
						html.push(entry.status.map(file => '<span data-state="' + file.state + '" data-xy="' + file.xy + '" title="' + file.state + '">' + file.xy.replace(' ', '&nbsp;') + ' ' + file.path + '</span>').join('\n'));
						html.push('</div>');
						html.push('</td>');

					} else {

						html.push('<td>');
						classes.push('no-changes');
						html.push('No changes');
						html.push('</td>');

					}

					html.push('<td>');

					let remotes = entry.remotes.filter(r => r.path !== 'origin/HEAD');
					if (remotes.length > 0) {

						html.push(remotes.map(remote => '<span class="' + (remote.hash === 'HEAD' ? 'head' : 'no-head') + '">' + remote.path + ': ' + remote.hash + '</span>').join('\n'));

						let check = remotes.map(r => r.hash).filter(r => r.hash !== 'HEAD').unique();
						if (check.length > 1) {

							remotes.forEach(remote => {

								remotes.forEach(other => {

									if (
										remote.branch === other.branch
										&& remote.hash !== other.hash
									) {
										classes.push('unsynced-remotes');
									}

								});

							});

						}

					} else {
						classes.push('no-remotes');
						html.push('-');
					}
					html.push('</td>');

					element.className = classes.unique().join(' ');
					element.innerHTML = html.join('');

					return element;

				}).forEach(entry => {

					_CACHE.push(entry);
					_TABLE.appendChild(entry);

				});

				setTimeout(_ => _filter_repos(), 200);

			}

		});

	}



	global.filter_repos = _filter_repos;
	global.reload_repos = _reload_repos;


	_reload_repos();

})(typeof global !== 'undefined' ? global : this);

