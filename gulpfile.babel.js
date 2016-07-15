import config from './config';
import sequence from 'run-sequence';
import path from 'path';
import browserSync from 'browser-sync';
import gulp from 'gulp';
import $plumber from 'gulp-plumber';
import $util from 'gulp-util';
import $size from 'gulp-size';
import $imagemin from 'gulp-imagemin';
import $sass from 'gulp-sass';
import $sourcemaps from 'gulp-sourcemaps';
import $babel from 'gulp-babel';
import $autoprefixer from 'gulp-autoprefixer';

// Rewrite gulp.src for better error handling.
var gulpSrc = gulp.src;
gulp.src = function () {
  return gulpSrc(...arguments)
    .pipe($plumber((error) => {
      const { plugin, message } = error;
      $util.log($util.colors.red(`Error (${plugin}): ${message}`));
      this.emit('end');
    }));
};

// Create server.
gulp.task('server', () => {
  browserSync.init({
    notify: false,
    server: {
      baseDir: config.developmentServerDir
    }
  });
});

// Compiles and deploys stylesheets.
gulp.task('stylesheets', () => {
  return gulp.src(config.stylesheets.entry)
    .pipe($sass({ outputStyle: 'compressed' }).on('error', $sass.logError))
    .pipe($autoprefixer())
    .pipe(gulp.dest(config.stylesheets.output))
    .pipe($size({ title: '[stylesheets]', gzip: true }))
    .pipe(browserSync.stream({ match: '**/*.css' }));
});

// Compiles and deploys images.
gulp.task('images', () => {
  return gulp.src(config.images.entry)
    .pipe($imagemin())
    .pipe($size({ title: '[images]', gzip: true }))
    .pipe(gulp.dest(config.images.output));
});

// Compiles and deploys javascript files.
gulp.task('javascripts', () => {
  return gulp.src(config.javascripts.entry)
    .pipe($babel())
    .pipe(gulp.dest(config.javascripts.output))
    .pipe($size({ title: '[javascripts]', gzip: true }))
    .pipe(browserSync.stream({ match: '**/*.js' }));
});

// Watch for file changes.
gulp.task('watch', () => {
  config.watch.entries.map((entry) => {
    gulp.watch(entry.files, { cwd: path.join(__dirname, 'source') }, entry.tasks);
  });

  gulp.watch(['/*.html']).on('change', () => {
    browserSync.reload('*.html');
  });
});

gulp.task('default', () => {
  let seq = [
    'images',
    'stylesheets',
    'javascripts',
    'server',
    'watch'
  ];

  sequence(...seq);
});
