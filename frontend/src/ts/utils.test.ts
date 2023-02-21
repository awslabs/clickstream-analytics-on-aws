import { generateStr, validateEmails } from './utils';

describe('generateStr', () => {
  it('generate 8 characters string', () => {
    const result = generateStr(8);
    expect(result.length).toBe(8);
  });
});

describe('generateStr', () => {
  it('generate 12 characters string', () => {
    const result = generateStr(12);
    expect(result.length).toBe(12);
  });
});

describe('validateEmails', () => {
  it('validate one correct email', () => {
    const result = validateEmails('email@example.com');
    expect(result).toBeTruthy();
  });
});

describe('validateEmails', () => {
  it('validate one incorrect email', () => {
    const result = validateEmails('email#example.com');
    expect(result).not.toBeTruthy();
  });
});

describe('validateEmails', () => {
  it('validate all email are valid', () => {
    const result = validateEmails('email@example.com, email2@example.com');
    expect(result).toBeTruthy();
  });
});

describe('validateEmails', () => {
  it('validate contains one incorrect email', () => {
    const result = validateEmails('email@example.com, email#example.com');
    expect(result).not.toBeTruthy();
  });
});
