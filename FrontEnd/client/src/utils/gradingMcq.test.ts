import { describe, expect, it } from 'vitest';
import { answerKey, countMcqOptions } from './gradingMcq';

describe('gradingMcq', () => {
  it('answerKey normalizes letter answers', () => {
    expect(answerKey('b')).toBe('B');
    expect(answerKey(['c'])).toBe('C');
    expect(answerKey(null)).toBeNull();
    expect(answerKey('')).toBeNull();
  });

  it('countMcqOptions counts option map entries', () => {
    expect(countMcqOptions({ A: 'one', B: 'two', C: 'three', D: 'four' })).toBe(4);
    expect(countMcqOptions(null)).toBe(0);
  });
});
