'use strict';
const config = require('config');
const languages = require('../../locales/languages');

let render = {

  // extraVars - object containing any vars we want to pass along to template
  // extraJSConfig - object containing any vars we want to expose to client-side
  //  scripts (must not contain sensitive data!)
  template(req, res, view, extraVars, extraJSConfig) {

    let vars = {};

    let jsConfig = {
      userName: req.user ? req.user.displayName : undefined,
      language: req.locale
    };

    if (extraJSConfig)
      Object.assign(jsConfig, extraJSConfig);

    vars.configScript = `window.config = ${JSON.stringify(jsConfig)};`;

    if (extraVars)
      Object.assign(vars, extraVars);

    vars.user = req.user;

    vars.scripts = ['lib.min.js'];
    if (extraVars && Array.isArray(extraVars.scripts))
      vars.scripts = vars.scripts.concat(extraVars.scripts);

    vars.languageNames = {};

    languages.getValidLanguages().forEach(langKey => {
      vars.languageNames[langKey] = {
        name: languages.getCompositeName(langKey, req.locale)
      };
      if (langKey == req.locale)
        vars.languageNames[langKey].isCurrentLanguage = true;
    });

    vars.currentLanguage = {
      langKey: req.locale,
      name: vars.languageNames[req.locale].name
    };

    if (req.csrfToken)
      vars.csrfToken = req.csrfToken();

    vars.qualifiedURL = config.qualifiedURL;

    // Non page-specific, will show up on any page if we have some to show
    vars.siteMessages = req.flash('siteMessages');
    vars.siteErrors = req.flash('siteErrors');
    res.render(view, vars);

  },

  signinRequired(req, res, extraVars) {
    render.template(req, res, 'signin-required', extraVars);
  },

  // Pass detailsKey in extraVars for message providing further details
  // about why permission is denied.
  permissionError(req, res, extraVars) {
    res.status(403);
    render.template(req, res, 'permission-error', extraVars);
  },

  // Pass titleKey and bodyKey in extraVars to explain the nature of the error
  // (e.g., page not found, stale revision). Don't forget to call
  // res.status as appropriate.
  resourceError(req, res, extraVars) {
    render.template(req, res, 'resource-error', extraVars);
  }

};

module.exports = render;
