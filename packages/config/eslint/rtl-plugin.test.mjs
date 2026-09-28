import { RuleTester } from 'eslint';
import { describe, expect, it } from 'vitest';

import rtl, { findPhysicalClass } from './rtl-plugin.mjs';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

describe('findPhysicalClass', () => {
  it('flags physical utilities, including behind variants', () => {
    expect(findPhysicalClass('flex ml-4')?.replacement).toBe('ms-');
    expect(findPhysicalClass('md:hover:pr-2')?.replacement).toBe('pe-');
    expect(findPhysicalClass('text-right')?.replacement).toBe('text-end');
    expect(findPhysicalClass('-left-2')?.replacement).toBe('start-');
  });

  it('accepts logical utilities and look-alikes', () => {
    expect(findPhysicalClass('ms-4 pe-2 start-0 text-start border-s rounded-e')).toBeNull();
    expect(findPhysicalClass('mx-4 px-2 space-x-2 min-w-0 leading-relaxed')).toBeNull();
  });
});

tester.run('no-physical-tailwind', rtl.rules['no-physical-tailwind'], {
  valid: [
    '<div className="ms-4 text-start" />',
    'const label = "ml-4";', // not a class context
    'cn("ps-2", active && "me-1")',
  ],
  invalid: [
    { code: '<div className="flex ml-4" />', errors: [{ messageId: 'physical' }] },
    { code: '<div className={`p-2 ${x} rounded-l-md`} />', errors: [{ messageId: 'physical' }] },
    { code: 'clsx("text-left")', errors: [{ messageId: 'physical' }] },
  ],
});

tester.run('no-physical-style', rtl.rules['no-physical-style'], {
  valid: [
    'StyleSheet.create({ row: { marginStart: 8, paddingEnd: 4 } })',
    '<View style={{ start: 0 }} />',
    'const point = { left: 1, right: 2 };', // not a style object
  ],
  invalid: [
    {
      code: 'StyleSheet.create({ row: { marginLeft: 8 } })',
      errors: [{ messageId: 'physicalKey' }],
    },
    { code: '<View style={{ right: 0 }} />', errors: [{ messageId: 'physicalKey' }] },
    { code: '<Text style={{ textAlign: "left" }} />', errors: [{ messageId: 'physicalAlign' }] },
  ],
});
