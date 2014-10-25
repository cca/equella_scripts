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
                src: ['**/*.js', '!node_modules/**', '!**/*.min.js']
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
