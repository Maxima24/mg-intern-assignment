import { classifySetuStatus, isComplete, isTerminalStatus } from '@mango/shared';

describe('setu status classifier (shared)', () => {
  it('marks only sign_complete as terminal + complete', () => {
    expect(classifySetuStatus('sign_complete')).toEqual({
      normalized: 'sign_complete',
      terminal: true,
      complete: true,
    });
  });

  it.each(['sign_initiated', 'sign_pending', 'sign_in_progress'])(
    'treats %s as non-terminal',
    (status) => {
      const c = classifySetuStatus(status);
      expect(c.terminal).toBe(false);
      expect(c.complete).toBe(false);
    },
  );

  it('normalizes unknown statuses without crashing', () => {
    const c = classifySetuStatus('some_future_status');
    expect(c.normalized).toBe('unknown');
    expect(c.terminal).toBe(false);
  });

  it('exposes convenience helpers', () => {
    expect(isComplete('sign_complete')).toBe(true);
    expect(isComplete('sign_pending')).toBe(false);
    expect(isTerminalStatus('sign_complete')).toBe(true);
    expect(isTerminalStatus('sign_in_progress')).toBe(false);
  });
});
