import { describe, expect, it } from 'vitest';
import { findLinkedinProfileUrl } from './linkedinProfile.schema';

describe('findLinkedinProfileUrl', () => {
  it('finds a profile link in what was typed', () => {
    expect(findLinkedinProfileUrl('https://www.linkedin.com/in/hassan-islam-3bbb98111/')).toBe(
      'https://www.linkedin.com/in/hassan-islam-3bbb98111/',
    );
    expect(findLinkedinProfileUrl('message linkedin.com/in/maaz please')).toBe(
      'linkedin.com/in/maaz',
    );
    expect(findLinkedinProfileUrl('https://pk.linkedin.com/in/ibrahim?utm=x')).toBe(
      'https://pk.linkedin.com/in/ibrahim?utm=x',
    );
  });

  it('ignores other links and plain questions', () => {
    expect(findLinkedinProfileUrl('https://www.linkedin.com/company/tkxel')).toBeNull();
    expect(findLinkedinProfileUrl('Share progress of all projects')).toBeNull();
  });
});
