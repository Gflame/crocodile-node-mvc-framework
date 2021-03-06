
import _ from 'lodash';
import s from 'underscore.string';
import chalk from 'chalk';

import sentry from './sentry';
import config from '../config';

// sentry supported log levels:
// <https://docs.getsentry.com/hosted/clients/node/usage/>
//
// * `debug` (the least serious)
// * `info`
// * `warning`
// * `error`
// * `fatal` (the most serious)
const levels = {
  'debug': 'cyan',
  'info': 'green',
  'warning': 'yellow',
  'error': 'red',
  'fatal': 'bgRed'
};

function ctxError(err, ctx) {

  console.log(err && err.stack);

  const meta = {
    extra: {}
  };

  if (err && err.stack)
    meta.extra.stack = err.stack;

  if (ctx && _.isObject(ctx.req)) {
    meta.extra.req = ctx.req;
    if (_.isObject(ctx.state.user))
      meta.user = {
        email: ctx.state.user.email,
        id: ctx.state.user.id
      };
  }

  logger.error(err.message, meta);

}

function log(level, message, meta) {

  // validate level

  if (level === 'warn') level = 'warning';
  if (level === 'err') level = 'error';

  if (!_.isString(level) || !_.includes(_.keys(levels), level)) {
    throw new Error(`\`level\` must be a string and one of ${_.keys(levels).join(', ')}`);
  }

  // validate meta
  if (!_.isObject(meta))
    meta = {};

  if (_.isUndefined(meta.extra) || _.isEmpty(meta.extra))
    meta = { extra: meta };
  else
    meta.extra = {};

  if (!_.isObject(meta.extra))
    throw new Error('`meta.extra` must be an object if it is set');

  // set default level on meta
  meta.level = level;

  // validate message (check for err first)
  if (_.isError(message)) {
    if (message.stack)
      meta.extra.stack = message.stack;
    message = message.message;
  }

  if (!_.isString(message) || s.isBlank(message))
    throw new Error('`message` must be a string and not empty');

  if (config.env === 'production') {

    if (level === 'error' || level === 'fatal')
      return sentry.captureException(message, meta);

    sentry.captureMessage(message, meta);

  }

  console.log(`${chalk[levels[level]](level)}: ${message}`);

  if (!config.showStack) return;

  if (!_.isEmpty(meta.extra))
    console.log(meta.extra);

  if (!_.isEmpty(meta.user))
    console.log(meta.user);

}

const logger = {
  ctxError,
  log
};

// bind helper functions for each log level
_.each(_.keys(levels), level => {
  logger[level] = (message, extra) => {
    logger.log(level, message, extra);
  };
});

// aliases
logger.err = logger.error;
logger.warn = logger.warning;

export default logger;
