var Readable = require('stream').Readable;
var dirname = require('path').dirname;
var execSync = require('child_process').execSync;
var denodeify = require('promise').denodeify;
var htmlTransformer = require('html-transformer');
var fs = require('fs');
var inherits = require('util').inherits;
var ncp = denodeify(require('ncp').ncp);

var staticRules = [
  {
    outputs: ['js/common/presets.js'],
    inputs: ['build/config.json'],
    rule: function() {
      var config = fs.readFileSync('build/config.json', { encoding: 'utf8' });
      fs.writeFileSync('js/common/presets.js', 'define(' + config + ');');
    }
  },

  {
    outputs: ['build_stage'],
    inputs: [],
    rule: function() {
      execSync('mkdir -p ./build_stage');
    }
  },

  {
    outputs: [
      'build_stage/elements',
      'build_stage/js',
      'build_stage/style'
    ],
    inputs: [
      'build_stage',
      'elements/**/*',
      'js/**/*',
      'style/**/*'
    ],
    rule: function() {
      return Promise.all([
        ncp('elements', 'build_stage/elements'),
        ncp('js', 'build_stage/js'),
        ncp('style', 'build_stage/style')
      ]);
    }
  },

  {
    outputs: [
      'build_stage/js/bundle.js',
      'build_stage/js/lazy_loaded.js'
    ],
    inputs: [
      'build_stage/shared/js/gesture_detector.js',
      'build_stage/shared/js/input_parser.js',
      'build_stage/shared/js/lazy_loader.js',
      'build_stage/shared/js/notification_helper.js',
      'build/calendar.build.js',
      'build/config.json',
      'js/**/*.js',
      'js/common/presets.js'
    ],
    rule: function() {
      execSync('./node_modules/.bin/r.js -o build/calendar.build.js');
    }
  }
];

var dynamicRules = [];

function RuleStream() {
  Readable.call(this, { objectMode: true });
  htmlTransformer.load('./index.html').then(function(transformer) {
    var dependencies = transformer.getSharedDependencies();
    var originals = dependencies.map(function(dependency) {
      return '../../' + dependency;
    });
    var copies = dependencies.map(function(dependency) {
      return 'build_stage/' + dependency;
    });

    dynamicRules.push({
      outputs: copies,
      inputs: originals,
      rule: function() {
        this.outputs.forEach(function(output) {
          var dir = dirname(output);
          execSync('mkdir -p ' + dir);
          execSync('cp ../../' + output.replace('build_stage/', '') + ' ' + dir);
        });
      }
    });

    this.finished = true;
  }.bind(this));

  this.finished = false;
}
inherits(RuleStream, Readable);

RuleStream.prototype._read = function() {
  if (staticRules.length) {
    return this.push(staticRules.shift());
  }

  if (!this.finished) {
    return setTimeout(this._read.bind(this), 10);
  }

  if (dynamicRules.length) {
    return this.push(dynamicRules.shift());
  }

  return this.push(null);
};

module.exports = RuleStream;
