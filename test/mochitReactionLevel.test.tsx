// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import FloatingMochitVisibilityControl from '@/components/mochit/FloatingMochitVisibilityControl';
import { loadFloatingMochitPreferences, parseFloatingMochitPreferences, saveFloatingMochitPreferences } from '@/components/mochit/floatingMochitPreferences';
import { getMacroIdleTuning } from '@/components/mochit/mochitMacroIdle';
afterEach(cleanup);
it('keeps the low level and saved position when hiding and restoring', () => {
  saveFloatingMochitPreferences({ visible: true, position: { x: 30, y: 40 } });
  render(<FloatingMochitVisibilityControl />);
  fireEvent.click(screen.getByRole('radio', { name: '低' }));
  expect(loadFloatingMochitPreferences()).toMatchObject({ reactionLevel: 'low', visible: true });
  fireEvent.click(screen.getByRole('radio', { name: '非表示' }));
  expect(loadFloatingMochitPreferences().visible).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'フローティングモチットを表示' }));
  expect(loadFloatingMochitPreferences()).toMatchObject({ reactionLevel: 'low', visible: true, position: { x: 30, y: 40 } });
});
it('preserves explicit levels and legacy hidden preferences', () => {
  expect(parseFloatingMochitPreferences(JSON.stringify({ visible: true, reactionLevel: 'low' }))).toMatchObject({ reactionLevel: 'low' });
  expect(parseFloatingMochitPreferences(JSON.stringify({ visible: false }))).toMatchObject({ visible: false });
});
it('high has more frequent spontaneous gestures while low retains its timing', () => {
  expect(getMacroIdleTuning(true, true).maxDelayMs).toBeLessThan(getMacroIdleTuning(true).minDelayMs);
  expect(getMacroIdleTuning(true).minDelayMs).toBe(7000);
});
