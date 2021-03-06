'use strict';

// Internal dependencies
const render = require('./helpers/render');
const debug = require('../util/debug');

class ErrorProvider {

  constructor(app) {
    this.app = app;
    // Bind 'this' so we can pass methods into middleware unmodified
    this.generic = this.generic.bind(this);
    this.notFound = this.notFound.bind(this);
    this.maintenanceMode = this.maintenanceMode.bind(this);
  }

  maintenanceMode(req, res) {
    if (req.path !== '/')
      return res.redirect('/');

    render.template(req, res, 'maintenance', {
      titleKey: 'maintenance mode'
    });
  }

  notFound(req, res) {
    res.status(404);
    render.template(req, res, '404', {
      titleKey: 'page not found title'
    });
  }

  generic(error, req, res, _next) {

    let showDetails;
    if (this.app.get('env') === 'development')
      showDetails = true;
    else
      showDetails = req.user && req.user.showErrorDetails;

    res.status(error.status || 500);

    if (req.isAPI) {
      let response;
      switch (error.message) {
        case 'invalid json':
          response = {
            message: 'Could not process your request.',
            errors: ['Received invalid JSON data. Make sure your payload is in JSON format.']
          };
          break;
        default:
          response = {
            message: 'An error occurred processing your request.',
            errors: showDetails ? [error.message, `Stack: ${error.stack}`] : ['Unknown error. This has been logged.']
          };
          debug.error({
            context: 'API',
            req,
            error
          });
      }
      res.type('json');
      res.send(JSON.stringify(response, null, 2));
    } else {

      debug.error({
        context: 'web app',
        req,
        error
      });

      render.template(req, res, 'error', {
        titleKey: 'something went wrong',
        showDetails,
        error
      });
    }
  }
}

module.exports = ErrorProvider;
