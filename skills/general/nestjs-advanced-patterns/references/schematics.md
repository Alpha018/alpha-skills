# Schematics

A schematic is a template- and rule-based code generator and transformer. The mechanism (Angular DevKit Schematics) originated in the Angular ecosystem but is framework-independent; it works the same way for NestJS, React, Vue, or any other codebase.

## Where this fits in NestJS

Commands like `nest g module`, `nest g service`, `nest g controller`, `nest g guard`, `nest g pipe` are themselves schematics. At an organization level, a custom schematic collection can enforce naming, architecture, folder structure, logging, metrics, security, health checks, containerization, testing, CI wiring, and tracing, consistently across every generated service, instead of relying on developers to remember and copy conventions by hand.

A custom command like `company g microservice orders` could generate a full service skeleton (Dockerfile, `main.ts`, `app.module.ts`, health/logging/metrics/tracing scaffolding, tests, deployment manifests, README) with organization-wide conventions already applied.

## Mental model

```text
Input/options
    ↓
Rules / transformations
    ↓
Virtual file tree
    ↓
Generated/modified project
```

Schematics aren't just file-copy templates: they can inspect a virtual file tree, modify existing code, edit ASTs, insert imports, update modules, rename/move files, chain transformations, and apply conditional logic.

## Core building blocks

- **`Tree`**: a virtual filesystem representation, a base plus staged changes, accumulated before anything touches disk.
- **`Rule`**: conceptually `Tree → Tree`, receives a tree, applies a transformation, returns the resulting tree.
- **`Action`**: the basic operations, create, rename, overwrite, delete.
- **`SchematicContext`**: the schematic's execution context, providing access to runtime services like logging.

## Scaffolding a schematic collection

```bash
npx @angular-devkit/schematics-cli blank --name=schematics
npm i @schematics/angular -D
npm run build -- --watch
npx @angular-devkit/schematics-cli ./schematics:configurable-module
```

Depending on the CLI version, a debug/dry-run flag may need to be explicitly disabled to actually apply changes.

## `collection.json`

```json
{
  "$schema": "../node_modules/@angular-devkit/schematics/collection-schema.json",
  "schematics": {
    "configurable-module": {
      "description": "Generates a configurable module.",
      "factory": "./configurable-module/index#generate",
      "schema": "./configurable-module/schema.json"
    }
  }
}
```

Flow: collection → schematic name → factory → `generate()`.

## `schema.json`

```json
{
  "$schema": "http://json-schema.org/schema",
  "$id": "configurable-module",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "description": "The name of the module.",
      "$default": { "$source": "argv", "index": 0 },
      "x-prompt": "What name would you like to use for the module?"
    }
  },
  "required": ["name"]
}
```

This gives the schematic a CLI argument, schema validation, and an interactive prompt for anything missing.

## A rule that generates a template and edits existing source

```ts
function updateModuleFile(tree: Tree, options: ConfigurableModuleSchematicOptions): Tree {
  const name = dasherize(options.name);
  const moduleFilePath = `src/${name}/${name}.module.ts`;
  const moduleFileContent = tree.readText(moduleFilePath);

  const source = ts.createSourceFile(moduleFilePath, moduleFileContent, ts.ScriptTarget.Latest, true);
  const updateRecorder = tree.beginUpdate(moduleFilePath);

  const insertImportChange = insertImport(
    source,
    moduleFilePath,
    'ConfigurableModuleClass',
    `./${name}.module-definition`,
  );

  if (insertImportChange instanceof InsertChange) {
    updateRecorder.insertRight(insertImportChange.pos, insertImportChange.toAdd);
  }

  const classNode = findNodes(source, ts.SyntaxKind.ClassDeclaration)[0];
  updateRecorder.insertRight(classNode.end - 2, 'extends ConfigurableModuleClass ');

  tree.commitUpdate(updateRecorder);
  return tree;
}

export function generate(options: ConfigurableModuleSchematicOptions): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    const templateSource = apply(url('./files'), [template({ ...options, ...strings }), move('src')]);

    return chain([
      externalSchematic('@nestjs/schematics', 'module', { name: options.name }),
      mergeWith(templateSource),
      (tree) => updateModuleFile(tree, options),
    ]);
  };
}
```

Pipeline: reuse the official Nest module schematic to generate the module → merge in custom template files → run an AST-level edit against the generated module file.

`externalSchematic()` matters here specifically because it lets a custom organizational schematic reuse Nest's own generation logic instead of reimplementing it.

## Reading the AST edit

1. Read the file's current text with `tree.readText(path)`.
2. Parse it into a TypeScript AST with `ts.createSourceFile(...)`.
3. Open an update recorder with `tree.beginUpdate(path)`.
4. Compute an import insertion with `insertImport(...)` and apply it via `recorder.insertRight(...)`.
5. Find the target node (here, the first class declaration) with `findNodes(...)`.
6. Insert text at a computed position, again via `recorder.insertRight(...)`.
7. Commit the change with `tree.commitUpdate(recorder)`.

Conceptually, this turns:

```ts
@Module({})
export class PaymentModule {}
```

into:

```ts
import { ConfigurableModuleClass } from './payment.module-definition';

@Module({})
export class PaymentModule extends ConfigurableModuleClass {}
```

## Fragility and production considerations

Positional manipulation like `classNode.end - 2` is fragile: it depends on exact source layout, syntax, TypeScript version, comments, and formatting. For organization-wide tooling, prefer semantic AST transformation over string-position manipulation wherever the schematics API allows it.

Always validate assumptions instead of indexing blindly:

```ts
if (!classNode) {
  throw new SchematicsException('Module class not found');
}
```

Internal package import paths (deep imports into a package's internals rather than its published entry points) can change between releases without notice. Prefer public exports whenever the schematics library offers one.
