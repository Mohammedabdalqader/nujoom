// ESLint rules that keep layouts direction-agnostic. Arabic (RTL) is the default
// locale, so physical left/right styling almost always renders wrong for most users.

// Tailwind utilities that hard-code a physical side, with their logical replacement.
const TAILWIND_PHYSICAL = [
  [/^-?ml-/, 'ms-'],
  [/^-?mr-/, 'me-'],
  [/^pl-/, 'ps-'],
  [/^pr-/, 'pe-'],
  [/^-?left-/, 'start-'],
  [/^-?right-/, 'end-'],
  [/^border-l(-|$)/, 'border-s'],
  [/^border-r(-|$)/, 'border-e'],
  [/^rounded-l(-|$)/, 'rounded-s'],
  [/^rounded-r(-|$)/, 'rounded-e'],
  [/^rounded-tl(-|$)/, 'rounded-ss'],
  [/^rounded-tr(-|$)/, 'rounded-se'],
  [/^rounded-bl(-|$)/, 'rounded-es'],
  [/^rounded-br(-|$)/, 'rounded-ee'],
  [/^text-left$/, 'text-start'],
  [/^text-right$/, 'text-end'],
  [/^float-left$/, 'float-start'],
  [/^float-right$/, 'float-end'],
  [/^scroll-ml-/, 'scroll-ms-'],
  [/^scroll-mr-/, 'scroll-me-'],
  [/^scroll-pl-/, 'scroll-ps-'],
  [/^scroll-pr-/, 'scroll-pe-'],
];

// React Native style keys that hard-code a physical side.
const STYLE_PHYSICAL = {
  marginLeft: 'marginStart',
  marginRight: 'marginEnd',
  paddingLeft: 'paddingStart',
  paddingRight: 'paddingEnd',
  left: 'start',
  right: 'end',
  borderLeftWidth: 'borderStartWidth',
  borderRightWidth: 'borderEndWidth',
  borderLeftColor: 'borderStartColor',
  borderRightColor: 'borderEndColor',
  borderTopLeftRadius: 'borderTopStartRadius',
  borderTopRightRadius: 'borderTopEndRadius',
  borderBottomLeftRadius: 'borderBottomStartRadius',
  borderBottomRightRadius: 'borderBottomEndRadius',
};

/** Returns the offending utility and its replacement, or null. */
export function findPhysicalClass(classString) {
  for (const raw of classString.split(/\s+/)) {
    if (!raw) continue;
    // Strip variants such as `md:hover:` and the important modifier.
    const utility = raw.split(':').pop().replace(/^!/, '');
    for (const [pattern, replacement] of TAILWIND_PHYSICAL) {
      if (pattern.test(utility)) return { utility: raw, replacement };
    }
  }
  return null;
}

const CLASS_ATTRIBUTES = new Set(['className', 'class']);
const CLASS_HELPERS = new Set(['cn', 'clsx', 'cva', 'twMerge']);

function isInsideClassContext(node) {
  for (let current = node.parent; current; current = current.parent) {
    if (current.type === 'JSXAttribute') return CLASS_ATTRIBUTES.has(current.name.name);
    if (current.type === 'CallExpression' && current.callee.type === 'Identifier') {
      if (CLASS_HELPERS.has(current.callee.name)) return true;
    }
    if (current.type === 'Program') return false;
  }
  return false;
}

const noPhysicalTailwind = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow physical left/right Tailwind utilities; use logical start/end.',
    },
    messages: {
      physical:
        '"{{utility}}" breaks RTL layouts. Use the logical "{{replacement}}" utility instead.',
    },
    schema: [],
  },
  create(context) {
    function check(node, value) {
      if (typeof value !== 'string' || !isInsideClassContext(node)) return;
      const hit = findPhysicalClass(value);
      if (hit) context.report({ node, messageId: 'physical', data: hit });
    }
    return {
      Literal: (node) => check(node, node.value),
      TemplateElement: (node) => check(node, node.value.cooked),
    };
  },
};

function isStyleObject(node) {
  const parent = node.parent;
  if (!parent) return false;
  // style={{ ... }} (also contentContainerStyle etc.)
  if (parent.type === 'JSXExpressionContainer') {
    const attribute = parent.parent;
    return attribute?.type === 'JSXAttribute' && /style$/i.test(attribute.name.name);
  }
  // StyleSheet.create({ name: { ... } })
  if (parent.type === 'Property' && parent.parent?.type === 'ObjectExpression') {
    const call = parent.parent.parent;
    return (
      call?.type === 'CallExpression' &&
      call.callee.type === 'MemberExpression' &&
      call.callee.object.name === 'StyleSheet' &&
      call.callee.property.name === 'create'
    );
  }
  return false;
}

const noPhysicalStyle = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow physical left/right React Native style keys; use start/end.' },
    messages: {
      physicalKey: '"{{key}}" breaks RTL layouts. Use "{{replacement}}" instead.',
      physicalAlign: 'textAlign "{{value}}" breaks RTL layouts. Omit it or use "auto".',
    },
    schema: [],
  },
  create(context) {
    return {
      ObjectExpression(node) {
        if (!isStyleObject(node)) return;
        for (const prop of node.properties) {
          if (prop.type !== 'Property') continue;
          const key = prop.key.type === 'Identifier' ? prop.key.name : prop.key.value;
          if (Object.hasOwn(STYLE_PHYSICAL, key)) {
            context.report({
              node: prop.key,
              messageId: 'physicalKey',
              data: { key, replacement: STYLE_PHYSICAL[key] },
            });
          }
          const value = prop.value.type === 'Literal' ? prop.value.value : null;
          if (key === 'textAlign' && (value === 'left' || value === 'right')) {
            context.report({ node: prop.value, messageId: 'physicalAlign', data: { value } });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: 'rtl' },
  rules: {
    'no-physical-tailwind': noPhysicalTailwind,
    'no-physical-style': noPhysicalStyle,
  },
};
