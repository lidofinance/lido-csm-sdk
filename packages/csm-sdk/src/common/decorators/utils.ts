/* eslint-disable no-console */
import { LOG_MODE } from '@lidofinance/lido-ethereum-sdk';
import { ConsoleCss } from './constants.js';
import { HeadMessage } from './types.js';

type CoreLog = {
  logMode: LOG_MODE;
};

const getLogMode = function <This>(this: This): LOG_MODE {
  let logMode: LOG_MODE = 'info';

  if (isCore(this)) {
    logMode = this.logMode;
  } else if (hasCore(this)) {
    logMode = this.core.logMode;
  }

  return logMode;
};

export const callConsoleMessage = function <This>(
  this: This,
  headMessage: HeadMessage,
  message: string,
  cssHeadMessage?: HeadMessage,
) {
  const logMode = getLogMode.call(this);

  if (logMode === 'none') return;

  if (headMessage === 'Init:') {
    return console.log(
      `%c${message}`,
      `${ConsoleCss[cssHeadMessage ?? headMessage]}`,
    );
  }

  if (logMode === 'debug') {
    return console.log(
      `%c${headMessage}`,
      `${ConsoleCss[cssHeadMessage ?? headMessage]}`,
      message,
    );
  }
};

export const isCore = function (value: unknown): value is CoreLog {
  return !!value && typeof value === 'object' && 'logMode' in value;
};

export const hasCore = function (value: unknown): value is { core: CoreLog } {
  return !!value && typeof value === 'object' && 'core' in value;
};
