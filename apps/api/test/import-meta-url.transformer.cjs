/**
 * ts-jest AST transformer (tests only): rewrites `import.meta.url` to
 * `require('node:url').pathToFileURL(__filename).href`.
 *
 * ts-jest compiles the API to CommonJS for Jest, where `import.meta` is a syntax
 * error. Prisma 7's generated client (src/generated/prisma/client.ts) is ESM and
 * reads `import.meta.url` to locate itself; the production build stays ESM and is
 * not affected by this file.
 */
module.exports = {
  name: 'import-meta-url',
  version: 1,
  factory(tsCompiler) {
    const ts = tsCompiler.configSet.compilerModule;
    return (ctx) => {
      const { factory } = ctx;
      const replacement = () =>
        factory.createPropertyAccessExpression(
          factory.createCallExpression(
            factory.createPropertyAccessExpression(
              factory.createCallExpression(factory.createIdentifier('require'), undefined, [
                factory.createStringLiteral('node:url'),
              ]),
              'pathToFileURL',
            ),
            undefined,
            [factory.createIdentifier('__filename')],
          ),
          'href',
        );
      const visit = (node) => {
        if (
          ts.isPropertyAccessExpression(node) &&
          node.name.text === 'url' &&
          ts.isMetaProperty(node.expression) &&
          node.expression.keywordToken === ts.SyntaxKind.ImportKeyword
        ) {
          return replacement();
        }
        return ts.visitEachChild(node, visit, ctx);
      };
      return (sourceFile) => ts.visitNode(sourceFile, visit);
    };
  },
};
