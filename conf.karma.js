/* eslint-disable no-console, camelcase */
const path = require('path');
// const karmaPlugins = ['karma-*'];
// const libPkg = require('./package.json');
const isCI = require('is-ci');

// dynamically require karma plugins from `videojs-generate-karma-config`
// as karma-* only works on project local plugins.
// Object.keys(libPkg.dependencies).forEach(function(pkgName) {
//   const parts = pkgName.split('/');
//   const name = parts[parts.length - 1];

//   if ((/^karma-/).test(name)) {
//     karmaPlugins.push(require(pkgName));
//   }
// });

const browserstackLaunchers = {
  bsChrome: {
    'base': 'BrowserStack',
    'browser': 'chrome',
    'os': 'Windows',
    'os_version': '10',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  },

  bsFirefox: {
    'base': 'BrowserStack',
    'browser': 'firefox',
    'os': 'Windows',
    'os_version': '10',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  },

  bsSafariMojave: {
    'base': 'BrowserStack',
    'browser': 'safari',
    'os': 'OS X',
    'os_version': 'Mojave',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  },

  bsSafariElCapitan: {
    'base': 'BrowserStack',
    'browser': 'safari',
    'os': 'OS X',
    'os_version': 'El Capitan',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  },

  bsEdgeWin10: {
    'base': 'BrowserStack',
    'browser': 'edge',
    'os': 'Windows',
    'os_version': '10',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  },

  bsIE11Win10: {
    'base': 'BrowserStack',
    'browser': 'ie',
    'browser_version': '11',
    'os': 'Windows',
    'os_version': '10',
    'browserstack.local': 'false',
    'browserstack.video': 'false'
  }
};

// detect if we are being run in "server mode" with --no-single-run
const inServerMode = () => {
  for (let i = 0; i < process.argv.length; i++) {
    const arg = process.argv[i];

    if ((/^(--no-single-run|--noSingleRun|--no-singleRun|--single-run=false|--singleRun=false)$/i).test(arg)) {
      return true;
    }
  }

  return false;
};

// normalize configured browsers based on:
// 1. if we are in ci and no browsers are passed in
// 2. We are in server mode and serverBrowsers is set
// 3. We are not in server mode and browsers is set
const normalizeBrowsers = ({serverMode, browsers, settings}) => {
  browsers = Array.isArray(browsers) ? browsers : [];

  // if browsers are not set explicitly, check if we are running in a ci.
  if (!browsers.length) {
    if (process.env.BROWSER_STACK_USERNAME && Object.keys(settings.browserstackLaunchers).length) {
      browsers = Object.keys(settings.browserstackLaunchers);
    } else if (isCI && Object.keys(settings.ciLaunchers).length) {
      browsers = Object.keys(settings.ciLaunchers);
    }
  }

  // in "server mode" if we have "serverBrowsers"
  if (serverMode && settings.serverBrowsers) {
    browsers = settings.serverBrowsers(browsers);
  } else if (!serverMode && settings.browsers) {
    browsers = settings.browsers(browsers);
  }

  return browsers;
};

// default settings
const getDefaults = () => {
  return {
    serverBrowsers: (browsers) => [],
    customLaunchers: {},
    ciLaunchers: {},
    browserstackLaunchers: Object.assign(browserstackLaunchers),
    showQUnitUI: inServerMode(),
    preferHeadless: true,
    reporters: [ isCI ? 'dots' : 'progress', 'coverage'],
    browsers: (browsers) => browsers,
    coverage: true,
    files: [
      'node_modules/video.js/dist/video-js.css',
      'dist/*.css',
      'node_modules/sinon/pkg/sinon.js',
      'node_modules/video.js/dist/video.js',
      'test/dist/bundle.js'
    ]
  };
};

module.exports = function(config, options = {}) {
  const cwd = process.env.INIT_CWD || process.cwd();
  const pkg = require(path.join(cwd, 'package.json'));
  const settings = getDefaults();
  const serverMode = inServerMode();

  // options that are passed as values
  ['preferHeadless', 'browsers', 'coverage', 'serverBrowsers', 'showQUnitUI', 'reporters'].forEach(function(k) {
    if (typeof options[k] !== 'undefined') {
      settings[k] = options[k];
    }
  });

  // options that are passed as functions
  // NOTE: we leave out serverBrowsers/browsers here as
  // those are configured in normalizeBrowsers
  ['customLaunchers', 'ciLaunchers', 'browserstackLaunchers', 'files'].forEach(function(k) {
    if (options[k]) {
      // pass default settings to the options function
      settings[k] = options[k](settings[k]);
    }
  });

  config.set({
    frameworks: ['qunit', 'detectBrowsers'],
    basePath: cwd,
    customHeaders: [
      {match: '.*', name: 'Cache-Control', value: 'no-cache, no-store, must-revalidate'},
      {match: '.*', name: 'Pragma', value: 'no-cache'},
      {match: '.*', name: 'Expires', value: '0'}
    ],
    customLaunchers: Object.assign(
      settings.customLaunchers,
      settings.ciLaunchers,
      settings.browserstackLaunchers
    ),
    // if we're showing QUnit UI, we shouldn't clearContext
    client: {clearContext: !settings.showQUnitUI, qunit: {showUI: settings.showQUnitUI, reorder: false, testTimeout: 5000}},
    browsers: normalizeBrowsers({serverMode, browsers: config.browsers, settings}),
    detectBrowsers: {
      preferHeadless: settings.preferHeadless,
      enabled: false,
      usePhantomJS: false,
      postDetection: settings.browsers
    },
    browserStack: {
      project: process.env.TEAMCITY_PROJECT_NAME || pkg.name,
      name: process.env.TEAMCITY_PROJECT_NAME || pkg.name,
      build: process.env.TEAMCITY_PROJECT_NAME || pkg.name,
      pollingTimeout: 30000,
      captureTimeout: 600,
      timeout: 600
    },
    reporters: settings.reporters,
    coverageReporter: {
      reporters: [
        // generates test/dist/coverage/index.html
        {type: 'html', dir: '.', subdir: 'test/dist/coverage'},

        // generates test/dist/coverage/lcov.info
        {type: 'lcovonly', dir: '.', subdir: 'test/dist/coverage'},

        // generates test/dist/coverage-final.json
        {type: 'json', dir: '.', subdir: 'test/dist/coverage'},

        // show a text summary on the command line
        {type: 'text', dir: '.', subdir: 'test/dist/coverage', file: 'text.txt'}
      ]
    },
    files: settings.files,
    port: 3030,
    urlRoot: '/test/',
    middleware: ['staticServer'],
    // plugins: karmaPlugins,
    colors: true,
    autoWatch: false,
    singleRun: true,
    concurrency: Infinity,
    browserDisconnectTolerance: 3,
    browserDisconnectTimeout: 300000,
    captureTimeout: 30000,
    browserNoActivityTimeout: 300000
  });

  // never detect browsers in serverMode or if we already have browsers configured
  if (!serverMode && !config.browsers.length) {
    config.detectBrowsers.enabled = true;
  }

  // never report coverage if coverage is false or in serverMode
  if (serverMode || settings.coverage === false) {
    delete config.coverageReporter;

    // remove coverage
    const covIndex = config.reporters.indexOf('coverage');

    if (covIndex >= 0) {
      config.reporters.splice(covIndex, 1);
    }

    // remove karma-coverage
    const karmaCovIndex = config.plugins.indexOf('karma-coverage');

    if (karmaCovIndex >= 0) {
      config.plugins.splice(karmaCovIndex, 1);
    }
  }

  return config;
};
