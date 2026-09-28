import fs from 'node:fs';

import { fixed, palette } from '@nujoom/tokens';
import { describe, expect, it } from 'vitest';

const css = fs.readFileSync(new URL('./app/globals.css', import.meta.url), 'utf8');
const block = (selector: string) => {
  const start = css.indexOf(selector);
  return css.slice(start, css.indexOf('\n}', start));
};

describe('globals.css', () => {
  it('matches the shared dark and fixed colours', () => {
    const theme = block('@theme {');
    for (const [name, value] of Object.entries({ ...palette.dark, ...fixed })) {
      expect(theme).toContain(`--color-${name}: ${value};`);
    }
  });

  it('matches the shared light colours', () => {
    const light = block("[data-theme='light'] {");
    for (const [name, value] of Object.entries(palette.light)) {
      expect(light).toContain(`--color-${name}: ${value};`);
    }
  });
});
