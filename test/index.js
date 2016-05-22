'use strict';

var assert, mockery, spooks, modulePath;

assert = require('chai').assert;
mockery = require('mockery');
spooks = require('spooks');

modulePath = '../src';

mockery.registerAllowable(modulePath);
mockery.registerAllowable('check-types');

suite('index:', function () {
    var log, walker;

    setup(function () {
        log = {};
        walker = {};
        mockery.enable({ useCleanCache: true });
        mockery.registerMock('espree', {
            parse: spooks.fn({
                name: 'espree.parse',
                log: log,
                results: [ 'espree.parse result' ]
            })
        });
        mockery.registerMock('escomplex-core/src/walker', walker);
        mockery.registerMock('escomplex-core/src/core', {
            analyse: spooks.fn({
                name: 'core.analyse',
                log: log,
                results: [ 'core.analyse result' ]
            })
        });
    });

    teardown(function () {
        mockery.deregisterMock('espree');
        mockery.deregisterMock('escomplex-core/src/walker');
        mockery.deregisterMock('escomplex-core/src/core');
        mockery.disable();
        log = walker = undefined;
    });

    test('require does not throw', function () {
        assert.doesNotThrow(function () {
            require(modulePath);
        });
    });

    test('require returns object', function () {
        assert.isObject(require(modulePath));
    });

    suite('require:', function () {
        var index;

        setup(function () {
            index = require(modulePath);
        });

        teardown(function () {
            index = undefined;
        });

        test('analyse function is exported', function () {
            assert.isFunction(index.analyse);
        });

        test('analyse does not throw', function () {
            assert.doesNotThrow(function () {
                index.analyse();
            });
        });

        test('espree.parse was not called', function () {
            assert.strictEqual(log.counts['espree.parse'], 0);
        });

        test('core.analyse was not called', function () {
            assert.strictEqual(log.counts['core.analyse'], 0);
        });

        suite('array source:', function () {
            var options, result;

            setup(function () {
                options = {};
                result = index.analyse([ { path: '/foo.js', code: 'console.log("foo");' },
                    { path: '../bar.js', code: '"bar";' } ], options);
            });

            teardown(function () {
                options = result = undefined;
            });

            test('espree.parse was called twice', function () {
                assert.strictEqual(log.counts['espree.parse'], 2);
            });

            test('espree.parse was passed two arguments first time', function () {
                assert.lengthOf(log.args['espree.parse'][0], 2);
            });

            test('espree.parse was given correct source first time', function () {
                assert.strictEqual(log.args['espree.parse'][0][0], 'console.log("foo");');
            });

            test('espree.parse was given correct options first time', function () {
                assert.isObject(log.args['espree.parse'][0][1]);
                assert.isTrue(log.args['espree.parse'][0][1].loc);
                assert.lengthOf(Object.keys(log.args['espree.parse'][0][1]), 3);
            });

            test('espree.parse was passed two arguments second time', function () {
                assert.lengthOf(log.args['espree.parse'][1], 2);
            });

            test('espree.parse was given correct source second time', function () {
                assert.strictEqual(log.args['espree.parse'][1][0], '"bar";');
            });

            test('espree.parse was given correct options second time', function () {
                assert.isObject(log.args['espree.parse'][1][1]);
                assert.isTrue(log.args['espree.parse'][1][1].loc);
                assert.lengthOf(Object.keys(log.args['espree.parse'][1][1]), 3);
            });

            test('core.analyse was called once', function () {
                assert.strictEqual(log.counts['core.analyse'], 1);
            });

            test('core.analyse was passed three arguments', function () {
                assert.lengthOf(log.args['core.analyse'][0], 3);
            });

            test('core.analyse was given correct asts', function () {
                assert.isArray(log.args['core.analyse'][0][0]);
                assert.lengthOf(log.args['core.analyse'][0][0], 2);

                assert.isObject(log.args['core.analyse'][0][0][0]);
                assert.strictEqual(log.args['core.analyse'][0][0][0].path, '/foo.js');
                assert.strictEqual(log.args['core.analyse'][0][0][0].ast, 'espree.parse result');
                assert.lengthOf(Object.keys(log.args['core.analyse'][0][0][0]), 2);

                assert.isObject(log.args['core.analyse'][0][0][1]);
                assert.strictEqual(log.args['core.analyse'][0][0][1].path, '../bar.js');
                assert.strictEqual(log.args['core.analyse'][0][0][1].ast, 'espree.parse result');
                assert.lengthOf(Object.keys(log.args['core.analyse'][0][0][1]), 2);
            });

            test('core.analyse was given correct walker', function () {
                assert.strictEqual(log.args['core.analyse'][0][1], walker);
            });

            test('core.analyse was given correct options', function () {
                assert.strictEqual(log.args['core.analyse'][0][2], options);
            });

            test('correct result was returned', function () {
                assert.strictEqual(result, 'core.analyse result');
            });
        });

        suite('array source with bad code:', function() {
            var code;

            setup(function () {
                mockery.deregisterMock('espree');
                mockery.disable();
                code = [ { path: '/foo.js', code: 'foo foo' }, { path: '../bar.js', code: '"bar";' } ];
                index = require(modulePath);
            });

            teardown(function () {
                code = undefined;
            });

            test('throws an error with default options', function() {
                assert.throws(function() {
                    index.analyse(code, {});
                }, '/foo.js: Unexpected token foo');
            });

            test('swallows error with options.ignoreErrors', function() {
                assert.doesNotThrow(function() {
                    index.analyse(code, { ignoreErrors: true });
                });
            });
        });

        suite('string source:', function () {
            var options, result;

            setup(function () {
                options = {};
                result = index.analyse('foo bar baz', options);
            });

            teardown(function () {
                options = result = undefined;
            });

            test('espree.parse was called once', function () {
                assert.strictEqual(log.counts['espree.parse'], 1);
            });

            test('espree.parse was passed two arguments', function () {
                assert.lengthOf(log.args['espree.parse'][0], 2);
            });

            test('espree.parse was given correct source', function () {
                assert.strictEqual(log.args['espree.parse'][0][0], 'foo bar baz');
            });

            test('espree.parse was given correct options', function () {
                assert.isObject(log.args['espree.parse'][0][1]);
                assert.isTrue(log.args['espree.parse'][0][1].loc);
                assert.lengthOf(Object.keys(log.args['espree.parse'][0][1]), 3);
            });

            test('core.analyse was called once', function () {
                assert.strictEqual(log.counts['core.analyse'], 1);
            });

            test('core.analyse was passed three arguments', function () {
                assert.lengthOf(log.args['core.analyse'][0], 3);
            });

            test('core.analyse was given correct ast', function () {
                assert.strictEqual(log.args['core.analyse'][0][0], 'espree.parse result');
            });

            test('core.analyse was given correct walker', function () {
                assert.strictEqual(log.args['core.analyse'][0][1], walker);
            });

            test('core.analyse was given correct options', function () {
                assert.strictEqual(log.args['core.analyse'][0][2], options);
            });

            test('correct result was returned', function () {
                assert.strictEqual(result, 'core.analyse result');
            });
        });

        suite('string esm source:', function () {
            var options, result;

            setup(function () {
                options = {};

                result = index.analyse('import foo from "./foo.js"; const s_BAR = 42; export default s_BAR;', options);
            });

            teardown(function () {
                options = result = undefined;
            });

            test('espree.parse was called once', function () {
                assert.strictEqual(log.counts['espree.parse'], 1);
            });

            test('espree.parse was passed two arguments', function () {
                assert.lengthOf(log.args['espree.parse'][0], 2);
            });

            test('espree.parse was given correct source', function () {
                assert.strictEqual(log.args['espree.parse'][0][0], 'import foo from "./foo.js"; const s_BAR = 42; export default s_BAR;');
            });

            test('espree.parse was given correct options', function () {
                assert.isObject(log.args['espree.parse'][0][1]);
                assert.isTrue(log.args['espree.parse'][0][1].loc);
                assert.strictEqual(log.args['espree.parse'][0][1].sourceType, 'module');
                assert.lengthOf(Object.keys(log.args['espree.parse'][0][1]), 4);
            });

            test('core.analyse was called once', function () {
                assert.strictEqual(log.counts['core.analyse'], 1);
            });

            test('core.analyse was passed three arguments', function () {
                assert.lengthOf(log.args['core.analyse'][0], 3);
            });

            test('core.analyse was given correct ast', function () {
                assert.strictEqual(log.args['core.analyse'][0][0], 'espree.parse result');
            });

            test('core.analyse was given correct walker', function () {
                assert.strictEqual(log.args['core.analyse'][0][1], walker);
            });

            test('core.analyse was given correct options', function () {
                assert.strictEqual(log.args['core.analyse'][0][2], options);
            });

            test('correct result was returned', function () {
                assert.strictEqual(result, 'core.analyse result');
            });
        });
    });
});
