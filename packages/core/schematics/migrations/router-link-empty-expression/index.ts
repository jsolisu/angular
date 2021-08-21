/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {logging, normalize} from '@angular-devkit/core';
import {Rule, SchematicContext, SchematicsException, Tree} from '@angular-devkit/schematics';
import {EmptyExpr, TmplAstBoundAttribute} from '@angular/compiler';
import {relative} from 'path';

import {NgComponentTemplateVisitor, ResolvedTemplate} from '../../utils/ng_component_template';
import {getProjectTsConfigPaths} from '../../utils/project_tsconfig_paths';
import {canMigrateFile, createMigrationProgram} from '../../utils/typescript/compiler_host';

import {analyzeResolvedTemplate} from './analyze_template';

type Logger = logging.LoggerApi;

const README_URL =
    'https://github.com/angular/angular/blob/master/packages/core/schematics/migrations/router-link-empty-expression/README.md';

interface FixedTemplate {
  originalTemplate: ResolvedTemplate;
  newContent: string;
  emptyRouterlinkExpressions: TmplAstBoundAttribute[];
}

/** Entry point for the RouterLink empty expression migration. */
export default function(): Rule {
  return (tree: Tree, context: SchematicContext) => {
    const {buildPaths, testPaths} = getProjectTsConfigPaths(tree);
    const basePath = process.cwd();

    if (!buildPaths.length && !testPaths.length) {
      throw new SchematicsException(
          'Could not find any tsconfig file. Cannot check templates for empty routerLinks.');
    }

    for (const tsconfigPath of [...buildPaths, ...testPaths]) {
      runEmptyRouterLinkExpressionMigration(tree, tsconfigPath, basePath, context.logger);
    }
  };
}

/**
 * Runs the routerLink migration, changing routerLink="" to routerLink="[]" and notifying developers
 * which templates received updates.
 */
function runEmptyRouterLinkExpressionMigration(
    tree: Tree, tsconfigPath: string, basePath: string, logger: Logger) {
  const {program} = createMigrationProgram(tree, tsconfigPath, basePath);
  const typeChecker = program.getTypeChecker();
  const templateVisitor = new NgComponentTemplateVisitor(typeChecker);
  const sourceFiles =
      program.getSourceFiles().filter(sourceFile => canMigrateFile(basePath, sourceFile, program));

  // Analyze source files by detecting HTML templates.
  sourceFiles.forEach(sourceFile => templateVisitor.visitNode(sourceFile));

  const {resolvedTemplates} = templateVisitor;
  fixEmptyRouterlinks(resolvedTemplates, tree, logger);
}

function fixEmptyRouterlinks(resolvedTemplates: ResolvedTemplate[], tree: Tree, logger: Logger) {
  const basePath = process.cwd();
  const collectedFixes: string[] = [];
  const fixesByFile = getFixesByFile(resolvedTemplates);

  for (const [absFilePath, fixes] of fixesByFile) {
    const treeFilePath = relative(normalize(basePath), normalize(absFilePath));
    const originalFileContent = tree.read(treeFilePath)?.toString();
    if (originalFileContent === undefined) {
      logger.error(
          `Failed to read file containing template; cannot apply fixes for empty routerLink expressions in ${
              treeFilePath}.`);
      continue;
    }

    const updater = tree.beginUpdate(treeFilePath);
    for (const fix of fixes) {
      const displayFilePath = normalize(relative(basePath, fix.originalTemplate.filePath));
      updater.remove(fix.originalTemplate.start, fix.originalTemplate.content.length);
      updater.insertLeft(fix.originalTemplate.start, fix.newContent);

      for (const n of fix.emptyRouterlinkExpressions) {
        const {line, character} =
            fix.originalTemplate.getCharacterAndLineOfPosition(n.sourceSpan.start.offset);
        collectedFixes.push(`${displayFilePath}@${line + 1}:${character + 1}`);
      }
      tree.commitUpdate(updater);
    }
  }

  if (collectedFixes.length > 0) {
    logger.info('---- RouterLink empty assignment schematic ----');
    logger.info('The behavior of empty/`undefined` inputs for `routerLink` has changed');
    logger.info('from linking to the current page to instead completely disable the link.');
    logger.info(`Read more about this change here: ${README_URL}`);
    logger.info('');
    logger.info('The following empty `routerLink` inputs were found and fixed:');
    collectedFixes.forEach(fix => logger.warn(`⮑   ${fix}`));
  }
}

/**
 * Returns fixes for nodes in templates which contain empty routerLink assignments, grouped by file.
 */
function getFixesByFile(templates: ResolvedTemplate[]): Map<string, FixedTemplate[]> {
  const fixesByFile = new Map<string, FixedTemplate[]>();
  for (const template of templates) {
    const templateFix = fixEmptyRouterlinksInTemplate(template);
    if (templateFix === null) {
      continue;
    }

    const file = template.filePath;
    if (fixesByFile.has(file)) {
      if (template.inline) {
        // External templates may be referenced multiple times in the project
        // (e.g. if shared between components), but we only want to record them
        // once. On the other hand, an inline template resides in a TS file that
        // may contain multiple inline templates.
        fixesByFile.get(file)!.push(templateFix);
      }
    } else {
      fixesByFile.set(file, [templateFix]);
    }
  }

  return fixesByFile;
}

function fixEmptyRouterlinksInTemplate(template: ResolvedTemplate): FixedTemplate|null {
  const emptyRouterlinkExpressions = analyzeResolvedTemplate(template);

  if (!emptyRouterlinkExpressions) {
    return null;
  }

  // Sort backwards so string replacements do not conflict
  emptyRouterlinkExpressions.sort((a, b) => b.value.sourceSpan.start - a.value.sourceSpan.start);
  let newContent = template.content;
  for (const expr of emptyRouterlinkExpressions) {
    if (expr.valueSpan) {
      newContent = newContent.substr(0, expr.value.sourceSpan.start) + '[]' +
          newContent.substr(expr.value.sourceSpan.start);
    } else {
      newContent = newContent.substr(0, expr.sourceSpan.end.offset) + '="[]"' +
          newContent.substr(expr.sourceSpan.end.offset);
    }
  }

  return {originalTemplate: template, newContent, emptyRouterlinkExpressions};
}
