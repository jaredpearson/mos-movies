'use strict';

// the directory where the compiled dist files will be
var distDir = 'dist';

module.exports = function(grunt) {
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        clean: {
            dist: {
                src: ['dist']
            }
        },

        mkdir: {
            dist: {
                options: {
                    create: ['dist']
                }
            }
        },

        copy: {
            dist: {
                files: [{
                        expand: true,
                        cwd: 'app/',
                        src: '**',
                        dest: distDir + '/app'
                    }, {
                        expand: true,
                        cwd: 'public/',
                        src: ['**/*', '!**/*.jsx', '!**/*.less'],
                        dest: distDir + '/public'
                    }, {
                        expand: true,
                        cwd: 'views/',
                        src: '**',
                        dest: distDir + '/views'
                    }
                ]
            }
        },

        less: {
            dist: {
                files: [{
                    expand: true,
                    cwd: 'public/stylesheets/',
                    src: '**.less',
                    ext: '.css',
                    dest: distDir + '/public/stylesheets'
                }]
            }
        },

        babel: {
            dist: {
                options: {
                    sourceMap: true,
                    comments: false,
                    compact: true
                },
                files: [{
                    expand: true,
                    cwd: 'public/javascript/',
                    src: '**.jsx',
                    ext: '.js',
                    dest: distDir + '/public/javascript/'
                }]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-mkdir');
    grunt.loadNpmTasks('grunt-babel');

    grunt.registerTask('dist', ['mkdir:dist', 'copy:dist', 'babel:dist', 'less:dist']);
};