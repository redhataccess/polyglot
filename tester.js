require.config({
    paths: {
        'jquery': '//cdnjs.cloudflare.com/ajax/libs/jquery/1.7.2/jquery.min'
    }
});

require(['polyglot', 'jquery'], function(P, $) {
    $(function() {
        $('#tester').submit(function(e) {
            e.preventDefault();
            var elements = this.elements;
            P.t(elements.keys.value, elements.lang.value).then(function(values) {
                $('#result').val(JSON.stringify(values, undefined, '\t'));
            });
        });
    });
});
