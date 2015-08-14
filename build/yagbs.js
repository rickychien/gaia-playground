var fs = require('fs');
var confidant = require('confidant');
var cfg = require('cfg-manager');
var ArgumentParser = require('argparse').ArgumentParser ;
var spawn = require('child-process-promise').spawn;

var CWD_PATH = process.cwd();

var parser = new ArgumentParser({
  version: require('../package').version,
  description: 'Yet another gaia build system',
  addHelp: true
});

parser.addArgument(['--dir'], {
  help: 'Where to search for configure.js build files',
  type: 'string',
  defaultValue: CWD_PATH
});

parser.addArgument(['--exclude'], {
  help: 'Optional comma separated list of directories to omit from fs scan',
  type: 'string',
  defaultValue: 'bower_components,node_modules'
});

parser.addArgument(['--config'], {
  help: 'Where to search for build-config.json and build-config-cache.json',
  type: 'string',
  defaultValue: CWD_PATH
});

function hasNewerConfig(cachePath, mergedConfig) {
  if (!fs.existsSync(cachePath)) return true;

  var cache = JSON.parse(fs.readFileSync(cachePath, { encoding: 'utf-8' }));
  return JSON.stringify(cache) !== JSON.stringify(mergedConfig);
}

function configuring(cachePath, mergedConfig, confidantOpt) {
  if (hasNewerConfig(cachePath, mergedConfig)) {
    console.log('Configuring...');
    return confidant(confidantOpt);
  } else {
    console.log('Skip configuring...');
    return Promise.resolve();
  }
}

function building(dir) {
  return new Promise(function(resolve, reject) {
    spawn('ninja', { cwd: dir })
      .progress(function (childProcess) {
        childProcess.stdout.on('data', function (data) {
            console.log('[Ninja]', data.toString());
        });
        childProcess.stderr.on('data', function (data) {
            console.log('[Ninja]', data.toString());
        });
      })
      .then(function() {
        console.log('Building with ninja fininsh.');
        resolve();
      })
      .fail(function(err) {
        console.error(err);
        reject(err);
      });
  });
}

function caching(cachePath, cache) {
  return new Promise(function(resolve, reject) {
    fs.writeFile(cachePath, cache, function(err) {
      if (err) reject(err);
      resolve(cache);
    });
  });
}

module.exports = function main(args) {
  args = args || parser.parseArgs();
  var dir = args.dir;
  var exclude = args.exclude;
  var config = args.config;
  var configPath = config + '/build-config.json';
  var cachePath = config + '/build-config-cache.json';

  // Merge build-config with envrionment varialbes if it exists
  try {
    cfg.file(configPath);
  } catch (err) {
    console.log('Config ' + configPath + ' not found, skipping...');
  }

  cfg
    .env()
    .config({
      ARGUMENT_DIR: dir,
      ARGUMENT_EXCLUDE: exclude,
      ARGUMENT_CONFIG: config
    });

  var mergedConfig = cfg._config;

  return configuring(cachePath, mergedConfig, { dir: dir, exclude: exclude })
    .then(function() {
      return building(dir);
    })
    .then(function() {
      return caching(cachePath, JSON.stringify(mergedConfig, null, 2));
    })
    .catch(function(err) {
      console.error(err.stdout ? err.stdout : err);
    });
}
