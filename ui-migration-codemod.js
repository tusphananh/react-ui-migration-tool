const jscodeshift = require("jscodeshift");

// Configuration: Map old components to new ones
const COMPONENT_MAPPING = {
  // Old component name -> New component name
  AvatarImage: "NewButton",
  OldInput: "NewInput",
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
    loading: "isLoading",
  },
  NewInput: {
    placeholder: "placeholderText",
    value: "inputValue",
    onChange: "onValueChange",
    error: "errorMessage",
  },
  NewModal: {
    visible: "isOpen",
    onClose: "onDismiss",
    title: "modalTitle",
    width: "modalWidth",
  },
  NewCard: {
    bordered: "hasBorder",
    shadow: "elevation",
    hoverable: "isHoverable",
  },
  // Add more component-specific prop mappings
};

const PROP_VALUE_MAPPING = {
  NewButton: {
    class: {
      bold: "strong",
      outline: "bordered",
      ghost: "text",
    },
    size: {
      small: "sm",
      medium: "md",
      large: "lg",
    },
  },
  NewInput: {
    size: {
      small: "sm",
      large: "lg",
    },
  },
  // Add more components and their prop value mappings
};

// Configuration: Props to remove for each component
const PROPS_TO_REMOVE = {
  NewButton: [
    "oldStyle",
    "legacyMode",
    // Props that no longer exist in the new library
  ],
  NewInput: [
    "autosize",
    "addonBefore",
    "addonAfter",
    // Old input-specific props to remove
  ],
  NewModal: [
    "mask",
    "maskClosable",
    "destroyOnClose",
    // Modal props that are no longer supported
  ],
  NewCard: [
    "loading",
    "noHovering",
    "type",
    // Card props to remove
  ],
  // Add more component-specific props to remove
};

// Configuration: Global props to remove from all components
const GLOBAL_PROPS_TO_REMOVE = [
  "data-testid", // if you want to remove all test ids
  "ref", // if you want to remove all refs (be careful with this)
  // Add props that should be removed from all components
];

// Configuration: Library names
const OLD_LIBRARY_NAME = "old-ui-library";
const NEW_LIBRARY_NAME = "new-ui-library";

/**
 * Remove specified props from JSX element
 */
function removeProps(attributes, propsToRemove) {
  return attributes.filter((attr) => {
    if (attr.type === "JSXAttribute" && attr.name && attr.name.name) {
      const propName = attr.name.name;
      return !propsToRemove.includes(propName);
    }
    return true;
  });
}

/**
 * Transform props: rename, remove, and transform values as specified
 */
function transformProps(attributes, componentName) {
  const propMapping = PROPS_MAPPING[componentName] || {};
  const valueMapping = PROP_VALUE_MAPPING[componentName] || {};
  const propsToRemove = [
    ...(PROPS_TO_REMOVE[componentName] || []),
    ...GLOBAL_PROPS_TO_REMOVE,
  ];

  // First, remove unwanted props
  let filteredAttributes = removeProps(attributes, propsToRemove);

  // Then, rename props and transform values according to mapping
  filteredAttributes.forEach((attr) => {
    if (attr.type === "JSXAttribute" && attr.name && attr.name.name) {
      const oldPropName = attr.name.name;
      const newPropName = propMapping[oldPropName] || oldPropName;

      // Update prop name
      attr.name.name = newPropName;

      // Transform prop value if there's a value mapping
      if (valueMapping[newPropName] && attr.value) {
        if (attr.value.type === "StringLiteral") {
          const oldValue = attr.value.value;
          const newValue = valueMapping[newPropName][oldValue];
          if (newValue) {
            attr.value.value = newValue;
          }
        } else if (
          attr.value.type === "JSXExpressionContainer" &&
          attr.value.expression.type === "StringLiteral"
        ) {
          const oldValue = attr.value.expression.value;
          const newValue = valueMapping[newPropName][oldValue];
          if (newValue) {
            attr.value.expression.value = newValue;
          }
        }
      }
    }
  });

  return filteredAttributes;
}

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

        // Transform props (rename and remove)
        if (path.node.attributes && path.node.attributes.length > 0) {
          const originalLength = path.node.attributes.length;
          path.node.attributes = transformProps(
            path.node.attributes,
            newComponentName
          );

          // Check if any attributes were removed or modified
          if (path.node.attributes.length !== originalLength) {
            hasChanges = true;
          }
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

  // Step 3: Handle components that keep the same name but need prop changes
  // This is useful when you're not changing component names but just updating props
  Object.keys(PROPS_MAPPING).forEach((componentName) => {
    if (!Object.values(COMPONENT_MAPPING).includes(componentName)) {
      // This component name wasn't in the mapping, so it might be a same-name component
      root.find(j.JSXOpeningElement).forEach((path) => {
        if (path.node.name.name === componentName) {
          if (path.node.attributes && path.node.attributes.length > 0) {
            const originalLength = path.node.attributes.length;
            const originalAttributes = JSON.stringify(path.node.attributes);

            path.node.attributes = transformProps(
              path.node.attributes,
              componentName
            );

            // Check if any attributes were removed or modified
            if (
              path.node.attributes.length !== originalLength ||
              JSON.stringify(path.node.attributes) !== originalAttributes
            ) {
              hasChanges = true;
            }
          }
        }
      });
    }
  });

  return hasChanges ? root.toSource({ quote: "single" }) : null;
}

module.exports = transformer;
module.exports.parser = "tsx";
