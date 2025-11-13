import { parseLocalDate } from '../mocks/handlers';

describe('parseLocalDate', () => {
  /* test('parses ISO YYYY-MM-DD', () => {
    const d = parseLocalDate('2025-11-12');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(10); // zero-based
    expect(d.getDate()).toBe(12);
  }); */

  test('parses DD/MM/YYYY', () => {
    const d = parseLocalDate('12/11/2025');
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(10);
    expect(d.getDate()).toBe(12);
  });

  test('returns Invalid Date for bad inputs', () => {
    const d = parseLocalDate('not-a-date');
    expect(isNaN(d.getTime())).toBe(true);
  });
});
