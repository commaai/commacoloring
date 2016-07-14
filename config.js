import path from 'path';
import { env as $env } from 'gulp-util';

// Common paths used throughout the Gulp pipeline.
const sourceDir = path.join(__dirname, 'source');
const buildDir = path.join(__dirname, 'build');
const modulesDir = path.join(__dirname, 'node_modules');
const developmentServerDir = path.join(__dirname);

// Supported CLI options.
const env = {
  debug: !!($env.env === 'debug' || process.env.NODE_ENV === 'development')
};

export default {
  env: env,
  cdn: ((process.env.CIRCLE_BRANCH === 'master') && process.env.CDN_PATH) || '',

  buildDir: buildDir,
  sourceDir: sourceDir,
  modulesDir: modulesDir,
  developmentServerDir: developmentServerDir,

  images: {
    entry: path.join(sourceDir, 'images', '**', '*.{jpg,jpeg,gif,png,svg,ico}'),
    output: path.join(buildDir, 'assets', 'images')
  },

  javascripts: {
    entry: path.join(sourceDir, 'javascripts', '**/*.js'),
    output: path.join(buildDir, 'assets', 'javascripts')
  },

  stylesheets: {
    entry: path.join(sourceDir, 'stylesheets', '*.{css,scss,sass}'),
    output: path.join(buildDir, 'assets', 'stylesheets')
  },

  watch: {
    entries: [{
      files: path.join('images', '**', '*.{jpg,jpeg,gif,png,svg}'),
      tasks: ['images']
    }, {
      files: path.join('stylesheets', '**', '*.{css,scss,sass}'),
      tasks: ['stylesheets']
    }, {
      files: path.join('javascripts', '**', '*.{js,jsx}'),
      tasks: ['javascripts']
    }]
  }
};
