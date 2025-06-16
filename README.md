# UI Library Migration Tool

A Node.js tool for automating UI component library migrations using codemods. This tool helps you automatically update component names, props, and import paths when migrating between UI libraries.

## Features

- Automatically transforms component names based on configured mappings
- Updates import paths from old library to new library
- Remaps component props according to new component specifications
- Creates backups of modified files
- Supports TypeScript/TSX files
- Provides dry-run option for testing transformations

## Installation

```sh
npm install
# or
pnpm install
```

## Usage

### Basic Migration

Run the migration on your source files:

```sh
npm run migrate
```

### Dry Run

Test the transformation without modifying files:

```sh
npm run dry-run
```

### Configuration

The migration rules are defined in `ui-migration-codemod.js`. You can customize:

1. Component mappings:

```js
const COMPONENT_MAPPING = {
  Avatar: "NewButton",
  AvatarFallback: "NewInput",
  // Add your mappings here
};
```

2. Props mappings:

```js
const PROPS_MAPPING = {
  NewButton: {
    className: "class",
    size: "buttonSize",
  },
  // Add your prop mappings here
};
```

3. Library names:

```js
const OLD_LIBRARY_NAME = "old-ui-library";
const NEW_LIBRARY_NAME = "new-ui-library";
```

## Script Options

The migration script (`migrate.js`) supports several options:

- Creates backups of modified files (enabled by default)
- Configurable source directories
- File extension filtering
- Ignore patterns for excluding files/directories

## Example

Before:

```tsx
import { Avatar, AvatarFallback } from "old-ui-library";

function UserAvatar({ className }) {
  return (
    <Avatar className={className}>
      <AvatarFallback>JD</AvatarFallback>
    </Avatar>
  );
}
```

After:

```tsx
import { NewButton, NewInput } from "new-ui-library";

function UserAvatar({ className }) {
  return (
    <NewButton class={className}>
      <NewInput>JD</NewInput>
    </NewButton>
  );
}
```

## License

MIT
