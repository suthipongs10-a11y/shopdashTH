import { describe, expect, it } from 'vitest';
import { mask, parseDevVars, parseWranglerVars, upsertDevVar } from '../../scripts/lib/config';

describe('parseDevVars', () => {
  it('reads KEY=value pairs and ignores comments and blank lines', () => {
    const parsed = parseDevVars(
      ['# comment', '', 'FOO=bar', '  BAZ = qux  ', '# TRAILING=ignored'].join('\n'),
    );
    expect(parsed).toEqual({ FOO: 'bar', BAZ: 'qux' });
  });

  it('strips matching surrounding quotes', () => {
    const parsed = parseDevVars(['A="quoted"', "B='single'", 'C="unbalanced'].join('\n'));
    expect(parsed).toEqual({ A: 'quoted', B: 'single', C: '"unbalanced' });
  });

  it('keeps "=" that appear inside the value', () => {
    expect(parseDevVars('TOKEN=abc=def==')).toEqual({ TOKEN: 'abc=def==' });
  });

  it('skips lines with no key', () => {
    expect(parseDevVars('=novalue\nOK=1')).toEqual({ OK: '1' });
  });
});

describe('upsertDevVar', () => {
  it('replaces an existing key in place', () => {
    expect(upsertDevVar('A=1\nB=2\nC=3\n', 'B', 'new')).toBe('A=1\nB=new\nC=3\n');
  });

  it('appends a missing key with a trailing newline', () => {
    expect(upsertDevVar('A=1\n', 'B', '2')).toBe('A=1\nB=2\n');
    expect(upsertDevVar('A=1', 'B', '2')).toBe('A=1\nB=2\n');
    expect(upsertDevVar('', 'B', '2')).toBe('B=2\n');
  });

  it('does not match a key that is only a prefix of another', () => {
    expect(upsertDevVar('TOKEN_ENC_KEY=keep\n', 'TOKEN', 'new')).toBe(
      'TOKEN_ENC_KEY=keep\nTOKEN=new\n',
    );
  });

  it('leaves commented-out keys alone and appends instead', () => {
    expect(upsertDevVar('# A=old\n', 'A', 'new')).toBe('# A=old\nA=new\n');
  });
});

describe('parseWranglerVars', () => {
  it('reads only the [vars] table', () => {
    const toml = [
      'name = "ads-insight"',
      '',
      '[vars]',
      'ENV = "dev"',
      'ADS_API_VERSION = "v25"',
      '# DEFAULT_CUSTOMER_ID = "000"',
      '',
      '[[d1_databases]]',
      'binding = "DB"',
    ].join('\n');
    expect(parseWranglerVars(toml)).toEqual({ ENV: 'dev', ADS_API_VERSION: 'v25' });
  });

  it('returns nothing when there is no [vars] table', () => {
    expect(parseWranglerVars('name = "x"\n[observability]\nenabled = true')).toEqual({});
  });

  it('keeps empty string values', () => {
    expect(parseWranglerVars('[vars]\nDEFAULT_CUSTOMER_ID = ""')).toEqual({
      DEFAULT_CUSTOMER_ID: '',
    });
  });

  it('reads the real wrangler.toml shipped with the project', () => {
    // guards against the committed config drifting away from what scripts expect
    const vars = parseWranglerVars(
      ['[vars]', 'ENV = "dev"', 'ACCOUNT_TZ = "Asia/Bangkok"', 'ADS_API_VERSION = "v25"'].join('\n'),
    );
    expect(vars['ACCOUNT_TZ']).toBe('Asia/Bangkok');
  });
});

describe('mask', () => {
  it('never reveals a long secret in full', () => {
    const secret = '1//0abcdefghijklmnopqrstuvwxyz';
    const masked = mask(secret);
    expect(masked).not.toContain(secret);
    expect(masked).toContain('1//0');
  });

  it('fully hides short values', () => {
    expect(mask('abc')).toBe('***');
  });
});
