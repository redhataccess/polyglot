/* globals define, angular */
(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['polyglot'], factory);
    } else {
        // Browser globals
        factory(root.Polyglot);
    }
}(this, function(Polyglot) {

    function getAttrs($attrs) {
        var attrFns = [],
            attrRegex = /poly(\w.*$)/,
            defaultFn = {
                fn: 'html'
            };
        angular.forEach($attrs.$attr, function(value, key) {
            var attr = key;
            if (attr === 'polyText') {
                attrFns.push({
                    fn: 'text'
                });
            } else if (attr === 'polyHtml') {
                attrFns.push(defaultFn);
            } else {
                var matches = attrRegex.exec(attr);
                if (matches && matches.length && matches.length === 2) {
                    attrFns.push({
                        fn: 'attr',
                        attr: matches[1].toLowerCase()
                    });
                }
            }
        });
        if (!attrFns.length) {
            attrFns.push(defaultFn);
        }
        return attrFns;
    }

    angular.module('ngPolyglot', [])
        .constant('POLYGLOT_LANG', 'en')
        .factory('polyglotFactory', function() {
            return Polyglot;
        })
        .directive('poly', ['polyglotFactory', 'POLYGLOT_LANG',
            function($Polyglot, lang) {
                function link($scope, $el, $attrs) {
                    var key = $attrs.poly;
                    if (!key) {
                        return console.log('No key provided to polyglot...');
                    }
                    var attrFns = getAttrs($attrs);
                    $Polyglot.k(key, lang).then(function(value) {
                        var $$el = angular.element($el);
                        angular.forEach(attrFns, function(attrFn) {
                            if (attrFn.fn && attrFn.attr) {
                                $$el[attrFn.fn](attrFn.attr, value);
                            } else if (attrFn.fn) {
                                $$el[attrFn.fn](value);
                            }
                        });
                    });
                }
                return {
                    restrict: 'A',
                    priority: 100,
                    link: link
                };
            }
        ]);
}));
