const jscodeshift = require("jscodeshift");

// Configuration: Map old components to new ones
const COMPONENT_MAPPING = {
  // Old component name -> New component name
  Avatar: "NewButton",
  AvatarFallback: "NewInput",
  OldModal: "NewModal",
  OldCard: "NewCard",
  // Add more mappings as needed
};

// Configuration: Map old props to new props for each component
const PROPS_MAPPING = {
  NewButton: {
    // old prop -> new prop
    className: "class",
    size: "buttonSize",
    disabled: "isDisabled",
  },
  NewInput: {
    placeholder: "placeholderText",
    value: "inputValue",
    onChange: "onValueChange",
  },
  NewModal: {
    visible: "isOpen",
    onClose: "onDismiss",
    title: "modalTitle",
  },
  NewCard: {
    bordered: "hasBorder",
    shadow: "elevation",
  },
  // Add more component-specific prop mappings
};

// Configuration: Library names
const OLD_LIBRARY_NAME = "old-ui-library";
const NEW_LIBRARY_NAME = "new-ui-library";

/**
 * Main transformation function
 */
function transformer(fileInfo, api) {
  const j = jscodeshift.withParser("tsx");
  const root = j(fileInfo.source);
  let hasChanges = false;

  // Step 1: Update import statements
  root.find(j.ImportDeclaration).forEach((path) => {
    const importPath = path.node.source.value;

    if (importPath === OLD_LIBRARY_NAME) {
      // Update the library name
      path.node.source.value = NEW_LIBRARY_NAME;
      hasChanges = true;

      // Update imported component names
      if (path.node.specifiers) {
        path.node.specifiers.forEach((specifier) => {
          if (specifier.type === "ImportSpecifier") {
            const oldName = specifier.imported.name;
            const newName = COMPONENT_MAPPING[oldName];

            if (newName) {
              specifier.imported.name = newName;
              // If there's no local alias, update the local name too
              if (specifier.local.name === oldName) {
                specifier.local.name = newName;
              }
              hasChanges = true;
            }
          }
        });
      }
    }
  });

  // Step 2: Update JSX elements (component usage)
  Object.keys(COMPONENT_MAPPING).forEach((oldComponentName) => {
    const newComponentName = COMPONENT_MAPPING[oldComponentName];

    // Find and update JSX opening elements
    root.find(j.JSXOpeningElement).forEach((path) => {
      if (path.node.name.name === oldComponentName) {
        path.node.name.name = newComponentName;
        hasChanges = true;

        // Update props if mapping exists
        const propMapping = PROPS_MAPPING[newComponentName];
        if (propMapping && path.node.attributes) {
          path.node.attributes.forEach((attr) => {
            if (attr.type === "JSXAttribute" && attr.name.name) {
              const oldPropName = attr.name.name;
              const newPropName = propMapping[oldPropName];

              if (newPropName) {
                attr.name.name = newPropName;
                hasChanges = true;
              }
            }
          });
        }
      }
    });

    // Find and update JSX closing elements
    root.find(j.JSXClosingElement).forEach((path) => {
      if (path.node.name.name === oldComponentName) {
        path.node.name.name = newComponentName;
        hasChanges = true;
      }
    });

    // Find and update JSX self-closing elements
    root.find(j.JSXElement).forEach((path) => {
      if (path.node.openingElement.name.name === oldComponentName) {
        if (path.node.closingElement) {
          path.node.closingElement.name.name = newComponentName;
        }
      }
    });
  });

  return hasChanges ? root.toSource({ quote: "single" }) : null;
}

module.exports = transformer;
module.exports.parser = "tsx";
