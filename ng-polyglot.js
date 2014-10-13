 (function(root, factory) {
     if (typeof define === 'function' && define.amd) {
         // AMD. Register as an anonymous module.
         define(['polyglot'], factory);
     } else {
         // Browser globals
         factory(root.Polyglot);
     }
 }(this, function(Polyglot) {

     angular.module('ngPolyglot', [])
         .constant('POLYGLOT_LANG', 'en')
         .factory('polyglotFactory', function() {
             return Polyglot;
         })
         .directive('poly', ['polyglotFactory', 'POLYGLOT_LANG',
             function($Polyglot, lang) {
                 return {
                     restrict: 'A',
                     priority: 100,
                     link: function($scope, $el, $attr) {
                         $Polyglot.k($attr.poly, lang).then(function(value) {
                             angular.element($el).html(value);
                         });
                     }
                 }
             }
         ]);
 }));
