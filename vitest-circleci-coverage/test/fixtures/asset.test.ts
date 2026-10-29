import { it, expect } from 'vitest';
import url from './asset.txt?url';
import raw from './asset.txt?raw';

it('should import assets with query suffixes', () => {
  expect(url).toBeTruthy();
  expect(raw).toBeTruthy();
});
