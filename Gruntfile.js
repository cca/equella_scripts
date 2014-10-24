/* global module,require */
module.exports = function (grunt) {
    'use strict';
    // load all grunt tasks
    require('load-grunt-tasks')(grunt);

    grunt.initConfig({
        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            files: {
                src: ['**/*.js', '!node_modules/**']
            }
        }
    });

    grunt.registerTask('test', [
        'jshint'
    ]);

    grunt.registerTask('default', [
        'jshint'
    ]);
};
