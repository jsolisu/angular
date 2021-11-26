/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {ERROR_LOGGER, ERROR_ORIGINAL_ERROR, ERROR_TYPE} from './util/errors';

export function getType(error: Error): Function {
  return (error as any)[ERROR_TYPE];
}

export function getOriginalError(error: Error): Error {
  return (error as any)[ERROR_ORIGINAL_ERROR];
}

export function getErrorLogger(error: unknown): (console: Console, ...values: any[]) => void {
  return error && (error as any)[ERROR_LOGGER] || defaultErrorLogger;
}


function defaultErrorLogger(console: Console, ...values: any[]) {
  (<any>console.error)(...values);
}
