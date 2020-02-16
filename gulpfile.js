'use strict';

const { src, dest, watch, series, parallel, lastRun } = require('gulp'),
    babel = require('gulp-babel'),
    webpack = require('webpack-stream'),
    gulpSass = require('gulp-sass'),
    cssmin = require('gulp-cssmin'),
    rename = require('gulp-rename'),
    prefix = require('gulp-autoprefixer'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    imagemin = require('gulp-imagemin'),
    browserSync = require('browser-sync').create();

// Configure CSS tasks.
function css() {
    return src('src/scss/**/*.scss', { sourcemaps: true })
        .pipe(gulpSass.sync().on('error', gulpSass.logError))
        .pipe(prefix('last 2 versions'))
        .pipe(cssmin())
        .pipe(rename({suffix: '.min'}))
        .pipe(dest('dist/css'), { sourcemaps: '.' })
        .pipe(browserSync.stream())
}
// Configure JS.
function js() {
    return src('src/js/**/*.js')
        .pipe(webpack())
        .pipe(babel({
            presets: ['@babel/env']
        }))
        .pipe(uglify())
        .pipe(concat('app.js'))
        .pipe(rename({suffix: '.min'}))
        .pipe(dest('dist/js'))
        .pipe(browserSync.stream())
}
// Configure image stuff.
function images() {
    return src('src/img/**/*.+(png|jpg|gif|svg)')
        .pipe(imagemin())
        .pipe(dest('dist/img'))
}
// Configure watch.
function survey() {
    watch('src/scss/**/*.scss', {ignoreInitial: false}, css)
    watch('src/js/**/*.js', {ignoreInitial: false}, js)
    watch('src/img/**/*.+(png|jpg|gif|svg)', {ignoreInitial: false}, images)
    watch('./*.html').on('change', browserSync.reload)
}
// Static Server + watching scss/js/images/html files
function serve() {
    browserSync.init({
        server: {
            baseDir: "./"
        },
        browser: ["chrome"]
    });
    survey()
}

module.exports = {
    js,
    css,
    images,
    default: series(serve),
}