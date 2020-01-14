/*jshint sub:true*/
(function () {
	'use strict';

	// Syntactic sugar
	function $(selector) {
		return document.querySelector(selector);
	}

	// Syntactic sugar & execute callback
	function $$(selector, callback) {
		var elems = document.querySelectorAll(selector);
		for (var i = 0; i < elems.length; ++i) {
			if (callback && typeof callback == 'function')
				callback.call(this, elems[i]);
		}
	}

	var debounce = function (func, wait, now) {
		var timeout;
		return function debounced() {
			var that = this,
				args = arguments;

			function delayed() {
				if (!now)
					func.apply(that, args);
				timeout = null;
			}
			if (timeout) {
				clearTimeout(timeout);
			} else if (now) {
				func.apply(obj, args);
			}
			timeout = setTimeout(delayed, wait || 250);
		};
	};

	var json_i18n = {
		"version": "20.0115",
		"theme": "Theme",
		"bright": "Bright",
		"dark_gray": "Dark Gray",
		"dark_blue": "Dark Blue",
		"dark_purple": "Dark Purple",
		"panels": "Panels",
		"items_per_page": "Items per Page",
		"tables": "Tables",
		"display_tables": "Display Tables",
		"ah_small": "Auto-Hide on Small Devices",
		"ah_small_title": "Automatically hide tables on small screen devices",
		"layout": "Layout",
		"horizontal": "Horizontal",
		"vertical": "Vertical",
		"other_opts": "Options",
		"export_json": "Export as JSON",
		"panel_opts": "Panel Options",
		"previous": "Previous",
		"next": "Next",
		"first": "First",
		"last": "Last",
		"chart_opts": "Chart Options",
		"chart": "Chart",
		"type": "Type",
		"area_spline": "Area Spline",
		"bar": "Bar",
		"plot_metric": "Plot Metric",
		"table_columns": "Table Columns",
		"thead": "Overall Analyzed Requests",
		"disconnected": "Disconnected",
		"connected": "Connected",
		"reconnecting": "Reconnecting",
		"realtime": "Now",
	};

	window.GoStats = window.GoStats || {
		initialize: function (options) {
			this.opts = options;

			this.AppState = {}; // current state app key-value store
			this.AppTpls = {}; // precompiled templates
			this.AppData = (this.opts || {}).data || {};
			this.AppDataPast = {};
			this.AppWSConn = (this.opts || {}).wsConnection || {};
			this.AppWSConn['credentials'] = this.opts.credentials;
			this.i18n = (this.opts || {}).i18n || {}; // i18n report labels
			this.AppPrefs = {
				'layout': 'horizontal',
				'perPage': 24,
				'theme': 'darkPurple',
			};
			this.AppPrefs = GoStats.Util.merge(this.AppPrefs, this.opts.prefs);

			if (GoStats.Util.hasLocalStorage()) {
				let ls = JSON.parse(localStorage.getItem('AppPrefs'));
				this.AppPrefs = GoStats.Util.merge(this.AppPrefs, ls);
			}
			this.setWebSocket();
		},

		getPrefs: function (panel) {
			return panel ? this.AppPrefs[panel] : this.AppPrefs;
		},

		setPrefs: function () {
			if (GoStats.Util.hasLocalStorage()) {
				localStorage.setItem('AppPrefs', JSON.stringify(GoStats.getPrefs()));
			}
		},

		getPanelData: function (panel, past = false) {
			if (past) {
				return panel && this.AppDataPast.hasOwnProperty(panel) ? this.AppDataPast[panel] : this.AppDataPast;
			}
			return panel ? this.AppData[panel] : this.AppData;
		},

		kill: function () {
			GoStats.AppWSConn.online = false;
			GoStats.Nav.WSClose();

			if (GoStats.AppWSConn.socket && GoStats.AppWSConn.socket.readyState) {
				GoStats.AppWSConn.socket.close();
			}

			delete GoStats.AppWSConn.socket;
		},

		resetWebSocket: function () {
			GoStats.AppWSConn.online = false;
			GoStats.Nav.WSTry();

			setTimeout(function () { GoStats.setWebSocket(); }, 333);
		},

		setWebSocket: function () {
			let dial = (window.location.protocol === "https:" ? 'wss://' : 'ws://');
			dial += window.location.hostname + (window.location.port ? ":" + window.location.port : "") + "/ws";
			if (GoStats.AppWSConn.credentials.length > 0) {
				dial += `?auth=${GoStats.AppWSConn.credentials[0]}`;
			}

			GoStats.AppWSConn.socket = new WebSocket(dial);
			GoStats.AppWSConn.socket.onopen = function (event) {
				GoStats.AppWSConn.online = true;
				GoStats.Nav.WSOpen();
			}.bind(this);

			GoStats.AppWSConn.socket.onmessage = function (event) {
				this.AppState['updated'] = true;

				try {
					const payload = JSON.parse(event.data);
					if (payload && payload.success) {
						if (payload.domains) {
							this.AppDataPast = this.AppData;
							this.AppData = payload;
							this.App.renderData();
						} else {
							console.log('Message: ', payload);
						}
					} else {
						console.warn('Unknown message: ', event.data);
					}
				} catch {}
			}.bind(this);

			GoStats.AppWSConn.socket.onclose = function (event) {
				GoStats.AppWSConn.online = false;
				GoStats.Nav.WSClose();
			}.bind(this);

			GoStats.AppWSConn.send = function (payload) {
				if (!GoStats.AppWSConn.socket || !GoStats.AppWSConn.online || !payload) {
					return;
				}
				if (typeof (payload) === 'string') {
					payload = {
						success: true,
						message: payload
					};
				}
				GoStats.AppWSConn.socket.send(JSON.stringify(payload));
			};
		},
	};

	GoStats.Util = {

		trendCalc: function (newData, oldData, key) {
			if (key === 'ALL' || key === 'unknown' || newData[key] === 0) {
				return 'default';
			}
			if (oldData.hasOwnProperty(key)) {
				if (newData[key] > oldData[key]) {
					return 'green';
				} else if (newData[key] < oldData[key]) {
					return 'red';
				} else {
					return 'blue';
				}
			}
			return 'default';
		},

		months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],

		// Add all attributes of n to o
		merge: function (o, n) {
			var obj = {},
				i = 0,
				il = arguments.length,
				key;
			for (; i < il; i++) {
				for (key in arguments[i]) {
					if (arguments[i].hasOwnProperty(key)) {
						obj[key] = arguments[i][key];
					}
				}
			}
			return obj;
		},

		// hash a string
		hashCode: function (s) {
			return (s.split('').reduce(function (a, b) {
				a = ((a << 5) - a) + b.charCodeAt(0);
				return a & a;
			}, 0) >>> 0).toString(16);
		},

		// Format bytes to human readable
		formatBytes: function (bytes, decimals, numOnly) {
			if (bytes == 0)
				return numOnly ? 0 : '0 Byte';
			var k = 1024;
			var dm = decimals + 1 || 2;
			var sizes = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB'];
			var i = Math.floor(Math.log(bytes) / Math.log(k));
			return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + (numOnly ? '' : (' ' + sizes[i]));
		},

		// Validate number
		isNumeric: function (n) {
			return !isNaN(parseFloat(n)) && isFinite(n);
		},

		// Format microseconds to human readable
		utime2str: function (usec) {
			if (usec >= 864E8)
				return ((usec) / 864E8).toFixed(2) + ' d';
			else if (usec >= 36E8)
				return ((usec) / 36E8).toFixed(2) + ' h';
			else if (usec >= 6E7)
				return ((usec) / 6E7).toFixed(2) + ' m';
			else if (usec >= 1E6)
				return ((usec) / 1E6).toFixed(2) + ' s';
			else if (usec >= 1E3)
				return ((usec) / 1E3).toFixed(2) + ' ms';
			return (usec).toFixed(2) + ' us';
		},

		// Format date from 20120124 to 24/Jan/2012
		formatDate: function (str) {
			var y = str.substr(0, 4),
				m = str.substr(4, 2) - 1,
				d = str.substr(6, 2),
				h = str.substr(8, 2) || 0,
				i = str.substr(10, 2) || 0,
				s = str.substr(12, 2) || 0;
			var date = new Date(y, m, d, h, i, s);

			var out = ('0' + date.getDate()).slice(-2) + '/' + this.months[date.getMonth()] + '/' + date.getFullYear();
			10 <= str.length && (out += ":" + h);
			12 <= str.length && (out += ":" + i);
			14 <= str.length && (out += ":" + s);
			return out;
		},

		// Format field value to human readable
		fmtValue: function (value, dataType, decimals) {
			var val = 0;
			if (!dataType)
				val = value;

			switch (dataType) {
				case 'utime':
					val = this.utime2str(value);
					break;
				case 'date':
					val = this.formatDate(value);
					break;
				case 'numeric':
					if (this.isNumeric(value))
						val = value.toLocaleString();
					break;
				case 'bytes':
					val = this.formatBytes(value, decimals);
					break;
				case 'percent':
					val = parseFloat(value.replace(',', '.')).toFixed(2) + '%';
					break;
				case 'time':
					if (this.isNumeric(value))
						val = value.toLocaleString();
					break;
				case 'secs':
					val = value + ' secs';
					break;
				default:
					val = value;
			}

			return value == 0 ? String(val) : val;
		},

		// Attempts to extract the count from either an object or a scalar.
		// e.g., item = Object {count: 14351, percent: 5.79} OR item = 4824825140
		getCount: function (item) {
			if (this.isObject(item) && 'count' in item)
				return item.count;
			return item;
		},

		getPercent: function (item) {
			if (this.isObject(item) && 'percent' in item)
				return this.fmtValue(item.percent, 'percent');
			return null;
		},

		isObject: function (o) {
			return o === Object(o);
		},

		setProp: function (o, s, v) {
			var schema = o;
			var a = s.split('.');
			for (var i = 0, n = a.length; i < n - 1; ++i) {
				var k = a[i];
				if (!schema[k])
					schema[k] = {};
				schema = schema[k];
			}
			schema[a[n - 1]] = v;
		},

		getProp: function (o, s) {
			s = s.replace(/\[(\w+)\]/g, '.$1');
			s = s.replace(/^\./, '');
			var a = s.split('.');
			for (var i = 0, n = a.length; i < n; ++i) {
				var k = a[i];
				if (this.isObject(o) && k in o) {
					o = o[k];
				} else {
					return;
				}
			}
			return o;
		},

		hasLocalStorage: function () {
			try {
				localStorage.setItem('test', 'test');
				localStorage.removeItem('test');
				return true;
			} catch (e) {
				return false;
			}
		},

		isWithinViewPort: function (el) {
			var elemTop = el.getBoundingClientRect().top;
			var elemBottom = el.getBoundingClientRect().bottom;
			return elemTop < window.innerHeight && elemBottom >= 0;
		},
	};

	GoStats.OverallStats = {
		target: null,

		// Render each overall stats box
		renderBox: function (data, row, x, idx) {
			var wrap = $('.wrap-general.' + this.target + ' > .wrap-general-items');

			// create a new bootstrap row every n elements
			if (idx % 4 == 0) {
				row = document.createElement('div');
				row.setAttribute('class', 'row');
				wrap.appendChild(row);
			}

			var box = document.createElement('div');
			var boxData = {
				'id': idx + '-' + x,
				'className': (x === 'ALL' || x === 'unknown') ? 'black' : 'gray',
				'color': '',
				'label': x.replace('_', ':'),
				'value': GoStats.Util.fmtValue(data[x], 'numeric'),
				'clickable': true,
			}
			if (this.target === 'realtime') {
				boxData = {
					'id': idx + '-' + x,
					'className': GoStats.Util.trendCalc(data, GoStats.getPanelData(this.target, true), x),
					'color': x === 'ALL' ? '#' + (Math.random() * (1 << 24) | 0).toString(16) : '',
					'label': x.replace('_', ':'),
					'value': GoStats.Util.fmtValue(data[x], 'numeric'),
				};
			}
			box.innerHTML = GoStats.AppTpls[this.target].items.render(boxData);
			row.appendChild(box);

			return row;
		},

		// Render overall stats
		renderData: function (data, meta) {
			if (!data)
				return;

			$('.last-updated').innerHTML = new Date().toLocaleString('tr');
			$('.wrap-general.' + this.target).innerHTML = GoStats.AppTpls[this.target].wrap.render({
				'head': this.target.toString().toUpperCase(),
				'desc': '',
				'rt': this.target === 'realtime' ? GoStats.i18n.realtime : '',
				'from': this.target === 'total' ? new Date().toLocaleDateString('tr') : '', // meta.start_date
				'to': this.target === 'total' ? new Date().toLocaleDateString('tr') : '', // meta.end_date
			});

			data['ALL'] = 0;
			for (const x in data)
				if (x != 'ALL')
					data['ALL'] += data[x]

			let idx = 0,
				row = null;
			Object.keys(data).sort((a, b) => data[a] - data[b]).reverse().map((key) => {
				row = this.renderBox(data, row, key, idx);
				idx++;
			});
		},

		// Render general/overall analyzed requests.
		initialize: function (source) {
			this.target = source;
			this.renderData(GoStats.getPanelData(source), GoStats.getPanelData('meta'));
		}
	};

	GoStats.Nav = {
		events: function () {
			$('.nav-bars').onclick = function (e) {
				e.stopPropagation();
				this.renderOpts(e);
			}.bind(this);

			$('.nav-minibars').onclick = function (e) {
				e.stopPropagation();
				this.renderOpts(e);
			}.bind(this);

			$('body').onclick = function (e) {
				$('nav').classList.remove('active');
			}.bind(this);

			$$('.theme-bright', function (item) {
				item.onclick = function (e) {
					this.setTheme('bright');
				}.bind(this);
			}.bind(this));

			$$('.theme-dark-blue', function (item) {
				item.onclick = function (e) {
					this.setTheme('darkBlue');
				}.bind(this);
			}.bind(this));

			$$('.theme-dark-gray', function (item) {
				item.onclick = function (e) {
					this.setTheme('darkGray');
				}.bind(this);
			}.bind(this));

			$$('.theme-dark-purple', function (item) {
				item.onclick = function (e) {
					this.setTheme('darkPurple');
				}.bind(this);
			}.bind(this));

			$$('.layout-horizontal', function (item) {
				item.onclick = function (e) {
					this.setLayout('horizontal');
				}.bind(this);
			}.bind(this));

			$$('.layout-vertical', function (item) {
				item.onclick = function (e) {
					this.setLayout('vertical');
				}.bind(this);
			}.bind(this));
		},

		downloadJSON: function (e) {
			var targ = e.currentTarget;
			var data = "text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(GoStats.getPanelData()));
			targ.href = 'data:' + data;
			targ.download = 'gostats-' + (+new Date()) + '.json';
		},

		setLayout: function (layout) {
			if ('horizontal' == layout) {
				$('.container').classList.add('container-fluid');
				$('.container').classList.remove('container');
			} else if ('vertical' == layout) {
				$('.container-fluid').classList.add('container');
				$('.container').classList.remove('container-fluid');
			}

			GoStats.AppPrefs['layout'] = layout;
			GoStats.setPrefs();
		},

		setTheme: function (theme) {
			if (!theme)
				return;

			$('html').className = '';
			switch (theme) {
				case 'darkGray':
					$('html').classList.add('dark');
					$('html').classList.add('gray');
					break;
				case 'darkBlue':
					$('html').classList.add('dark');
					$('html').classList.add('blue');
					break;
				case 'darkPurple':
					$('html').classList.add('dark');
					$('html').classList.add('purple');
					break;
			}
			GoStats.AppPrefs['theme'] = theme;
			GoStats.setPrefs();
		},

		getTheme: function () {
			return GoStats.AppPrefs.theme || 'darkGray';
		},

		getLayout: function () {
			return GoStats.AppPrefs.layout || 'horizontal';
		},

		// Render left-hand side navigation options.
		renderOpts: function () {
			var o = {};
			o[this.getLayout()] = true;
			o[this.getTheme()] = true;
			o['labels'] = GoStats.i18n;
			$('.nav-list').innerHTML = GoStats.AppTpls.Nav.opts.render(o);
			$('nav').classList.toggle('active');
			this.events();
		},

		WSStatus: function () {
			if (Object.keys(GoStats.AppWSConn).length)
				$$('.nav-ws-status', function (item) {
					item.style.display = 'block';
				});
		},

		WSClose: function () {
			$$('.nav-ws-status', function (item) {
				item.classList.remove('connected');
				item.setAttribute('title', GoStats.i18n.disconnected);
			});
			$$('.report-title', (item) => item.innerText = GoStats.i18n.disconnected);
		},

		WSOpen: function () {
			$$('.nav-ws-status', function (item) {
				item.classList.add('connected');
				item.setAttribute('title', GoStats.i18n.connected);
			});
			$$('.report-title', (item) => item.innerText = GoStats.i18n.connected);
		},

		WSTry: function () {
			$$('.nav-ws-status', function (item) {
				item.setAttribute('title', GoStats.i18n.reconnecting);
			});
			$$('.report-title', (item) => item.innerText = GoStats.i18n.reconnecting);
		},

		// Render left-hand side navigation given the available panels.
		renderWrap: function (nav) {
			$('nav').innerHTML = GoStats.AppTpls.Nav.wrap.render(GoStats.i18n);
		},

		// Iterate over all available panels and render each.
		initialize: function () {
			this.setTheme(GoStats.AppPrefs.theme);
			this.renderWrap();
			this.WSStatus();
			this.events();
		}
	};

	GoStats.App = {
		hasFocus: true,

		tpl: function (tpl) {
			return Hogan.compile(tpl);
		},

		setTpls: function () {
			GoStats.AppTpls = {
				'Nav': {
					'wrap': this.tpl($('#tpl-nav-wrap').innerHTML),
					'opts': this.tpl($('#tpl-nav-opts').innerHTML),
				},
				'realtime': {
					'wrap': this.tpl($('#tpl-general').innerHTML),
					'items': this.tpl($('#tpl-general-items').innerHTML),
				},
				'total': {
					'wrap': this.tpl($('#tpl-general').innerHTML),
					'items': this.tpl($('#tpl-general-items').innerHTML),
				},
			};
		},

		initDom: function () {
			$('nav').classList.remove('hide');
			$('.container').classList.remove('hide');
			$('.spinner').classList.add('hide');

			if (GoStats.AppPrefs['layout'] == 'horizontal') {
				$('.container').classList.add('container-fluid');
				$('.container-fluid').classList.remove('container');
			}
		},

		renderData: function () {
			// update data and charts if tab/document has focus
			if (!this.hasFocus)
				return;

			GoStats.OverallStats.initialize('realtime');
			GoStats.OverallStats.initialize('total');

			// do not rerender if data hasn't changed
			if (!GoStats.AppState.updated)
				return;
		},

		initialize: function () {
			this.setTpls();
			GoStats.Nav.initialize();
			this.initDom();
			this.renderData();
		},
	};

	document.addEventListener('visibilitychange', function () {
		// fires when user switches tabs, apps, etc.
		if (document.visibilityState === 'hidden')
			GoStats.App.hasFocus = false;

		// fires when app transitions from hidden or user returns to the app/tab.
		if (document.visibilityState === 'visible') {
			var hasFocus = GoStats.App.hasFocus;
			GoStats.App.hasFocus = true;
			hasFocus || GoStats.App.renderData();
		}

		if (document.visibilityState === 'visible' &&
			(!GoStats.AppWSConn.socket || GoStats.AppWSConn.socket.readyState > 1)) {
			GoStats.resetWebSocket()
		}
		if (document.visibilityState === 'hidden' &&
			GoStats.AppWSConn.socket.readyState <= 1) {
			GoStats.kill();
		}
	});

	// Init app
	window.onload = function () {
		GoStats.initialize({
			'i18n': json_i18n,
			'data': window.json_data || {},
			'prefs': window.html_prefs || {},
			'credentials': window.credentials || [],
		});
		GoStats.App.initialize();
		window.credentials = null;
	};
}());