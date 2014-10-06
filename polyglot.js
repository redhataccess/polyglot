/* globals define */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'moment'], factory);
    } else {
        // Browser globals
        root.Polyglot = factory(root.jQuery, root.moment);
    }
}(this, function($, moment) {
    var instance = null,
        FALLBACK_KEY = 'RHCP-_POLYGLOT',
        //STORAGE_KEY = 'RHCP-POLYGLOT',
        VALID_LANGS = ['en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'pt', 'ru', 'zh_CN'],
        POLYGLOT_SERVER = 'https://polyglot-redhataccess.itos.redhat.com/',
        hasStorage = ('localStorage' in window && window.localStorage !== null);

    /**
     * normalizes requested language.
     * 1) if a language wasn't provided it will look in the window.portal
     * object. If there isn't a window.portal object we will return english
     * 2) ensures it is a valid language
     * @param  {String} lang
     * @return {String} normalized language
     */
    var _normalizeLang = function(lang) {
            if (!lang && window.portal && window.portal.lang) {
                lang = window.portal.lang;
            }
            if (!lang) {
                return 'en';
            }
            var validLang = false,
                i;
            for (i = 0; i < VALID_LANGS.length; i++) {
                // poor man's Array.indexOf
                if (lang === VALID_LANGS[i]) {
                    validLang = true;
                    break;
                }
            }
            if (!validLang) {
                // I don't know what you gave me. Here is english.
                return 'en';
            }
            return lang;
        },
        _searchForRegExp = function(haystack, needle, obj) {
            var x;
            for (x in haystack) {
                // 'query' the object in localStorage using the regex
                if (needle.test(x)) {
                    obj[x] = haystack[x];
                }
            }
        },
        _objKeys = function(obj) {
            if (Object.keys) {
                return Object.keys(obj);
            }
            // poor man's Object.keys
            var result = [],
                prop;
            for (prop in obj) {
                if (obj.hasOwnProperty(obj, prop)) {
                    result.push(prop);
                }
            }
        },
        _sortKeys = function(keys) {
            // string -> array -> sort -> string
            return keys.split(',').sort().join(',');
        },
        _safeStore = function(key, value) {
            if (!hasStorage) {
                // :'(
                return false;
            }
            if (typeof value === 'undefined') {
                // return value
                return window.localStorage.getItem(key);
            }
            // set value
            return window.localStorage.setItem(key, value);
        };

    var Polyglot = function() {
        // init object of already called deferreds
        this._fetchDfds = {};
        // the vals we have so far
        this._vals = {};
        // prepare for the worst
        this._initFallback();
    };

    /**
     * fetch provided keys from the polyglot server
     * @param  {string} keys String of comma separated keys
     * @param  {string} lang The desired language
     * @return {Promise}
     */
    Polyglot.prototype.t = function(keys, lang, version) {
        lang = _normalizeLang(lang);
        keys = _sortKeys(keys);
        var hash = lang + '_' + keys;
        if (version) {
            hash += ('_' + version);
        }
        if (!this._fetchDfds[hash]) {
            this._fetchDfds[hash] = this._fetch(keys, lang, version);
        }
        return this._fetchDfds[hash];
    };

    Polyglot.prototype._fetch = function(keys, lang, version) {
        var dfd = new $.Deferred(),
            self = this,
            queryData = {
                keys: keys,
                lang: lang
            };
        if (version) {
            queryData.version = version;
        }

        this._get(POLYGLOT_SERVER, queryData, true).done(function(data) {
            var keys = _objKeys(data),
                prop;

            for (var i = 0; i < keys.length; i++) {
                lang = keys[i];
                if (typeof self._vals[lang] === 'undefined') {
                    self._vals[lang] = {};
                }
                // Mixin returned vals to local vals
                for (prop in data[lang]) {
                    self._vals[lang][prop] = data[lang][prop];
                }
            }
            dfd.resolve(data);
        }).fail(function() {
            // hail mary
            dfd.resolve(self._fallback(keys, lang));
        });
        return dfd.promise();
    };

    Polyglot.prototype._fallback = function(keys, lang) {
        var fallback = _safeStore(FALLBACK_KEY);
        if (!fallback) {
            console.error('Couldn\'t fallback!');
            return;
        }
        lang = _normalizeLang(lang);
        fallback = JSON.parse(fallback);
        fallback = fallback[lang];
        keys = keys.split(',');
        var obj = {};
        obj[lang] = {};
        var endsWithStar = /\*$/;
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            if (endsWithStar.test(key)) {
                _searchForRegExp(fallback, new RegExp(key), obj[lang]);
                continue;
            }
            if (fallback[key]) {
                obj[lang][key] = fallback[key];
            }
        }
        return obj;
    };

    Polyglot.prototype._initFallback = function() {
        var hasFallback = _safeStore(FALLBACK_KEY);
        if (hasFallback) {
            var now = moment().utc();
            var fallback = JSON.parse(hasFallback);
            if (now.isBefore(moment(fallback.expires, 'YYYYMMDD').utc())) {
                return;
            }
        }
        // fetch all keys and all lang and jam them in localStorage
        this._fetch('.*', '.*').then(function(vals) {
            if (vals) {
                var now = moment().utc();
                vals.expires = now.add(1, 'week').format('YYYYMMDD');
                _safeStore(FALLBACK_KEY, JSON.stringify(vals));
            }
        });
    };

    Polyglot.prototype._get = function(url, data, cors) {
        var dfd = new $.Deferred(),
            // *groan* IE
            xhr = (typeof XDomainRequest !== 'undefined' && cors) ? new XDomainRequest() : new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status < 400) {
                    dfd.resolve(JSON.parse(xhr.response));
                } else {
                    dfd.reject();
                }
            }
        }
        var reqUrl = (url + '?' + $.param(data));
        xhr.open('GET', reqUrl);
        xhr.send(null);
        return dfd.promise();
    };

    /**
     * Get the Polyglot singleton, or create one if it doesn't exist
     * @return {Polyglot} Polyglot an Polyglot instance
     */
    Polyglot.getInstance = function() {
        if (instance === null) {
            instance = new Polyglot();
        }
        return instance;
    };

    return Polyglot.getInstance();
}));