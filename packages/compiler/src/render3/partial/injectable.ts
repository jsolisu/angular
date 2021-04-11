/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
import {createInjectableType, R3InjectableMetadata, R3ProviderExpression} from '../../injectable_compiler_2';
import * as o from '../../output/output_ast';
import {Identifiers as R3} from '../r3_identifiers';
import {R3CompiledExpression} from '../util';
import {DefinitionMap} from '../view/util';

import {R3DeclareInjectableMetadata} from './api';
import {compileDependency, generateForwardRef} from './util';

/**
 * Compile a Injectable declaration defined by the `R3InjectableMetadata`.
 */
export function compileDeclareInjectableFromMetadata(meta: R3InjectableMetadata):
    R3CompiledExpression {
  const definitionMap = createInjectableDefinitionMap(meta);

  const expression = o.importExpr(R3.declareInjectable).callFn([definitionMap.toLiteralMap()]);
  const type = createInjectableType(meta);

  return {expression, type, statements: []};
}

/**
 * Gathers the declaration fields for a Injectable into a `DefinitionMap`.
 */
export function createInjectableDefinitionMap(meta: R3InjectableMetadata):
    DefinitionMap<R3DeclareInjectableMetadata> {
  const definitionMap = new DefinitionMap<R3DeclareInjectableMetadata>();

  definitionMap.set('version', o.literal('0.0.0-PLACEHOLDER'));
  definitionMap.set('ngImport', o.importExpr(R3.core));
  definitionMap.set('type', meta.internalType);

  // Only generate providedIn property if it has a non-null value
  if (meta.providedIn !== undefined) {
    const providedIn = convertFromProviderExpression(meta.providedIn);
    if ((providedIn as o.LiteralExpr).value !== null) {
      definitionMap.set('providedIn', providedIn);
    }
  }

  if (meta.useClass !== undefined) {
    definitionMap.set('useClass', convertFromProviderExpression(meta.useClass));
  }
  if (meta.useExisting !== undefined) {
    definitionMap.set('useExisting', convertFromProviderExpression(meta.useExisting));
  }
  if (meta.useValue !== undefined) {
    definitionMap.set('useValue', convertFromProviderExpression(meta.useValue));
  }
  // Factories do not contain `ForwardRef`s since any types are already wrapped in a function call
  // so the types will not be eagerly evaluated. Therefore we do not need to process this expression
  // with `convertFromProviderExpression()`.
  if (meta.useFactory !== undefined) {
    definitionMap.set('useFactory', meta.useFactory);
  }

  if (meta.deps !== undefined) {
    definitionMap.set('deps', o.literalArr(meta.deps.map(compileDependency)));
  }

  return definitionMap;
}

/**
 * Convert an `R3ProviderExpression` to an `Expression`, possibly wrapping its expression in a
 * `forwardRef()` call.
 *
 * If `R3ProviderExpression.isForwardRef` is true then the expression was originally wrapped in a
 * `forwardRef()` call to prevent the value from being eagerly evaluated in the code.
 *
 * Normally, the linker will statically process the code, putting the `expression` inside a factory
 * function so the `forwardRef()` wrapper is not evaluated before it has been defined. But if the
 * partial declaration is evaluated by the JIT compiler the `forwardRef()` call is still needed to
 * prevent eager evaluation of the `expression`.
 *
 * So in partial declarations, expressions that could be forward-refs are wrapped in `forwardRef()`
 * calls, and this is then unwrapped in the linker as necessary.
 *
 * See `packages/compiler-cli/src/ngtsc/annotations/src/injectable.ts` and
 * `packages/compiler/src/jit_compiler_facade.ts` for more information.
 */
function convertFromProviderExpression({expression, isForwardRef}: R3ProviderExpression):
    o.Expression {
  return isForwardRef ? generateForwardRef(expression) : expression;
}
