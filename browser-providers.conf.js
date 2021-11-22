/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// Unique place to configure the browsers which are used in the different CI jobs in Sauce Labs (SL)
// If the target is set to null, then the browser is not run anywhere during CI.
// If a category becomes empty (e.g. BS and required), then the corresponding job must be commented
// out in the CI configuration.
var CIconfiguration = {
  // Chrome and Firefox run as part of the Bazel browser tests, so we do not run them as
  // part of the legacy Saucelabs tests.
  'Chrome': {unitTest: {target: null, required: false}, e2e: {target: null, required: true}},
  'Firefox': {unitTest: {target: null, required: false}, e2e: {target: null, required: true}},
  // Set ESR as a not required browser as it fails for Ivy acceptance tests.
  'FirefoxESR': {unitTest: {target: 'SL', required: false}, e2e: {target: null, required: true}},
  // Disabled because using the "beta" channel of Chrome can cause non-deterministic CI results.
  // e.g. a new chrome beta version has been released, but the Saucelabs selenium server does
  // not provide a chromedriver version that is compatible with the new beta.
  'ChromeBeta': {unitTest: {target: 'SL', required: false}, e2e: {target: null, required: false}},
  'ChromeDev': {unitTest: {target: 'SL', required: false}, e2e: {target: null, required: true}},
  // FirefoxBeta and FirefoxDev should be target:'BS' or target:'SL', and required:true
  // Currently deactivated due to https://github.com/angular/angular/issues/7560
  'FirefoxBeta': {unitTest: {target: null, required: true}, e2e: {target: null, required: false}},
  'FirefoxDev': {unitTest: {target: null, required: true}, e2e: {target: null, required: true}},
  'Edge': {unitTest: {target: 'SL', required: false}, e2e: {target: null, required: true}},
  'Android10': {unitTest: {target: 'SL', required: true}, e2e: {target: null, required: true}},
  'Android11': {unitTest: {target: 'SL', required: true}, e2e: {target: null, required: true}},
  'Safari12': {unitTest: {target: 'SL', required: false}, e2e: {target: null, required: true}},
  'Safari13': {unitTest: {target: 'SL', required: false}, e2e: {target: null, required: true}},
  'iOS12': {unitTest: {target: 'SL', required: false}, e2e: {target: null, required: true}},
  'iOS13': {unitTest: {target: 'SL', required: false}, e2e: {target: null, required: true}},
  'WindowsPhone': {unitTest: {target: 'BS', required: false}, e2e: {target: null, required: true}}
};

var customLaunchers = {
  'DartiumWithWebPlatform':
      {base: 'Dartium', flags: ['--enable-experimental-web-platform-features']},
  'ChromeNoSandbox': {base: 'Chrome', flags: ['--no-sandbox']},
  'SL_CHROME': {base: 'SauceLabs', browserName: 'chrome', version: '81'},
  'SL_CHROMEBETA': {base: 'SauceLabs', browserName: 'chrome', version: 'beta'},
  'SL_CHROMEDEV': {base: 'SauceLabs', browserName: 'chrome', version: 'dev'},
  'SL_FIREFOX': {base: 'SauceLabs', browserName: 'firefox', version: '76'},
  // Firefox 68 is the current ESR vesion
  'SL_FIREFOXESR': {base: 'SauceLabs', browserName: 'firefox', version: '68'},
  'SL_FIREFOXBETA':
      {base: 'SauceLabs', platform: 'Windows 10', browserName: 'firefox', version: 'beta'},
  'SL_FIREFOXDEV':
      {base: 'SauceLabs', platform: 'Windows 10', browserName: 'firefox', version: 'dev'},
  'SL_SAFARI12':
      {base: 'SauceLabs', browserName: 'safari', platform: 'macOS 10.13', version: '12.1'},
  'SL_SAFARI13':
      {base: 'SauceLabs', browserName: 'safari', platform: 'macOS 10.15', version: '13.0'},
  'SL_IOS12': {
    base: 'SauceLabs',
    browserName: 'Safari',
    platform: 'iOS',
    version: '12.0',
    device: 'iPhone 7 Simulator'
  },
  'SL_IOS13': {
    base: 'SauceLabs',
    browserName: 'Safari',
    platform: 'iOS',
    version: '13.0',
    device: 'iPhone 11 Simulator'
  },
  'SL_EDGE': {
    base: 'SauceLabs',
    browserName: 'MicrosoftEdge',
    platform: 'Windows 10',
    version: '14.14393'
  },
  'SL_ANDROID10': {
    base: 'SauceLabs',
    browserName: 'Chrome',
    platform: 'Android',
    version: '10.0',
    device: 'Android GoogleAPI Emulator'
  },
  'SL_ANDROID11': {
    base: 'SauceLabs',
    browserName: 'Chrome',
    platform: 'Android',
    version: '11.0',
    device: 'Android GoogleAPI Emulator'
  },
};

var sauceAliases = {
  'ALL': Object.keys(customLaunchers).filter(function(item) {
    return customLaunchers[item].base == 'SauceLabs';
  }),
  'DESKTOP': ['SL_CHROME', 'SL_FIREFOX', 'SL_EDGE', 'SL_SAFARI12', 'SL_SAFARI13', 'SL_FIREFOXESR'],
  'MOBILE': ['SL_ANDROID10', 'SL_ANDROID11', 'SL_IOS12', 'SL_IOS13'],
  'ANDROID': ['SL_ANDROID10', 'SL_ANDROID11'],
  'FIREFOX': ['SL_FIREFOXESR'],
  'IOS': ['SL_IOS12', 'SL_IOS13'],
  'SAFARI': ['SL_SAFARI12', 'SL_SAFARI13'],
  'BETA': ['SL_CHROMEBETA', 'SL_FIREFOXBETA'],
  'DEV': ['SL_CHROMEDEV', 'SL_FIREFOXDEV'],
  'CI_REQUIRED': buildConfiguration('unitTest', 'SL', true),
  'CI_OPTIONAL': buildConfiguration('unitTest', 'SL', false)
};

module.exports = {
  customLaunchers: customLaunchers,
  sauceAliases: sauceAliases,
};

function buildConfiguration(type, target, required) {
  return Object.keys(CIconfiguration)
      .filter((item) => {
        var conf = CIconfiguration[item][type];
        return conf.required === required && conf.target === target;
      })
      .map((item) => target + '_' + item.toUpperCase());
}
