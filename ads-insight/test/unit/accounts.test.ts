import { describe, expect, it } from 'vitest';
import { parseAccessibleCustomers } from '../../scripts/lib/ads-rest';
import {
  dedupeAccounts,
  formatAccountLine,
  parseCustomerClientRow,
  parseCustomerRow,
  recommendSettings,
  sortAccounts,
  type AccountSummary,
} from '../../scripts/lib/accounts';

/** Shape of a real `customers:listAccessibleCustomers` response. */
const accessibleResponse = {
  resourceNames: ['customers/1234567890', 'customers/9876543210'],
};

/** Shape of a real `SELECT customer.* FROM customer` row. */
const customerRow = {
  customer: {
    resourceName: 'customers/1234567890',
    id: '1234567890',
    descriptiveName: 'ร้านล้างแอร์ภูเก็ต',
    currencyCode: 'THB',
    timeZone: 'Asia/Bangkok',
    manager: false,
    testAccount: false,
  },
};

/** customer_client rows: int64 fields (id, level) come back as strings. */
const managerSelfRow = {
  customerClient: {
    id: '1111111111',
    descriptiveName: 'MCC หลัก',
    currencyCode: 'THB',
    timeZone: 'Asia/Bangkok',
    manager: true,
    testAccount: false,
    level: '0',
    status: 'ENABLED',
    hidden: false,
  },
};
const childRow = {
  customerClient: {
    id: '2222222222',
    descriptiveName: 'ลูกค้า A',
    currencyCode: 'THB',
    timeZone: 'Asia/Bangkok',
    manager: false,
    testAccount: false,
    level: '1',
    status: 'ENABLED',
    hidden: false,
  },
};

describe('parseAccessibleCustomers', () => {
  it('strips the customers/ prefix', () => {
    expect(parseAccessibleCustomers(accessibleResponse)).toEqual(['1234567890', '9876543210']);
  });

  it('returns empty when the account has no access anywhere', () => {
    expect(parseAccessibleCustomers({})).toEqual([]);
    expect(parseAccessibleCustomers({ resourceNames: [] })).toEqual([]);
  });

  it('drops entries that are not customer resource names', () => {
    expect(
      parseAccessibleCustomers({ resourceNames: ['customers/123', 'garbage', 42, null] }),
    ).toEqual(['123']);
  });
});

describe('parseCustomerRow', () => {
  it('reads a real customer row', () => {
    expect(parseCustomerRow(customerRow)).toEqual({
      id: '1234567890',
      name: 'ร้านล้างแอร์ภูเก็ต',
      currency: 'THB',
      timeZone: 'Asia/Bangkok',
      isManager: false,
      isTest: false,
      isHidden: false,
      level: 0,
    });
  });

  it('treats absent manager/testAccount flags as false, not undefined', () => {
    const parsed = parseCustomerRow({ customer: { id: '1' } });
    expect(parsed?.isManager).toBe(false);
    expect(parsed?.isTest).toBe(false);
  });

  it('returns undefined for a row with no customer or no id', () => {
    expect(parseCustomerRow({})).toBeUndefined();
    expect(parseCustomerRow({ customer: { descriptiveName: 'x' } })).toBeUndefined();
  });
});

describe('parseCustomerClientRow', () => {
  it('parses level from the string int64 the REST API returns', () => {
    expect(parseCustomerClientRow(childRow)?.level).toBe(1);
    expect(parseCustomerClientRow(managerSelfRow)?.level).toBe(0);
  });

  it('accepts a numeric level too', () => {
    expect(
      parseCustomerClientRow({ customerClient: { id: '1', level: 2 } })?.level,
    ).toBe(2);
  });

  it('falls back to level 0 when the value is unusable', () => {
    expect(parseCustomerClientRow({ customerClient: { id: '1', level: 'abc' } })?.level).toBe(0);
  });

  it('carries hidden and non-enabled status through', () => {
    const parsed = parseCustomerClientRow({
      customerClient: { id: '3', level: '1', status: 'CANCELED', hidden: true },
    });
    expect(parsed).toMatchObject({ isHidden: true, status: 'CANCELED' });
  });
});

describe('dedupeAccounts', () => {
  it('keeps the shallowest copy of an account linked under two managers', () => {
    const deep: AccountSummary = { id: '5', isManager: false, isTest: false, isHidden: false, level: 2 };
    const shallow: AccountSummary = { ...deep, level: 1 };
    expect(dedupeAccounts([deep, shallow])).toEqual([shallow]);
    expect(dedupeAccounts([shallow, deep])).toEqual([shallow]);
  });
});

describe('sortAccounts', () => {
  it('puts shallower levels first, managers ahead of clients within a level', () => {
    const accounts: AccountSummary[] = [
      { id: '3', name: 'client', isManager: false, isTest: false, isHidden: false, level: 1 },
      { id: '1', name: 'root', isManager: true, isTest: false, isHidden: false, level: 0 },
      { id: '2', name: 'sub-mcc', isManager: true, isTest: false, isHidden: false, level: 1 },
    ];
    expect(sortAccounts(accounts).map((a) => a.id)).toEqual(['1', '2', '3']);
  });

  it('sorts test accounts last so the real account is what you see first', () => {
    const accounts: AccountSummary[] = [
      { id: '5', name: 'Test Client', isManager: false, isTest: true, isHidden: false, level: 0 },
      { id: '1', name: 'ร้านล้างแอร์', isManager: false, isTest: false, isHidden: false, level: 0 },
    ];
    expect(sortAccounts(accounts).map((a) => a.id)).toEqual(['1', '5']);
  });

  it('does not mutate the input', () => {
    const accounts: AccountSummary[] = [
      { id: '2', isManager: false, isTest: false, isHidden: false, level: 1 },
      { id: '1', isManager: false, isTest: false, isHidden: false, level: 0 },
    ];
    sortAccounts(accounts);
    expect(accounts.map((a) => a.id)).toEqual(['2', '1']);
  });
});

describe('formatAccountLine', () => {
  it('indents by level and labels MCC and test accounts', () => {
    expect(formatAccountLine(parseCustomerClientRow(managerSelfRow)!)).toContain('111-111-1111');
    expect(formatAccountLine(parseCustomerClientRow(managerSelfRow)!)).toContain('[MCC]');

    const child = formatAccountLine(parseCustomerClientRow(childRow)!);
    expect(child.startsWith('  ')).toBe(true);
    expect(child).toContain('ลูกค้า A');
    expect(child).toContain('THB · Asia/Bangkok');
  });

  it('shows a placeholder for an unnamed account', () => {
    expect(
      formatAccountLine({ id: '1234567890', isManager: false, isTest: false, isHidden: false, level: 0 }),
    ).toContain('(ไม่มีชื่อ)');
  });

  it('flags a non-enabled status', () => {
    const line = formatAccountLine({
      id: '1234567890',
      isManager: false,
      isTest: false,
      isHidden: false,
      status: 'CANCELED',
      level: 0,
    });
    expect(line).toContain('CANCELED');
  });
});

describe('recommendSettings', () => {
  const real = (id: string, over: Partial<AccountSummary> = {}): AccountSummary => ({
    id,
    isManager: false,
    isTest: false,
    isHidden: false,
    level: 0,
    currency: 'THB',
    ...over,
  });

  it('picks the single real account and leaves LOGIN_CUSTOMER_ID unset for direct access', () => {
    const result = recommendSettings([real('1234567890')]);
    expect(result.DEFAULT_CUSTOMER_ID).toBe('1234567890');
    expect(result.LOGIN_CUSTOMER_ID).toBeUndefined();
    // blank here is the right answer, not a gap the user has to fill
    expect(result.emptyReasons.LOGIN_CUSTOMER_ID).toContain('ถูกแล้ว');
  });

  it('explains every blank it leaves behind', () => {
    const ambiguous = recommendSettings([real('1234567890'), real('9876543210')]);
    expect(ambiguous.emptyReasons.DEFAULT_CUSTOMER_ID).toBeTruthy();
    expect(ambiguous.emptyReasons.LOGIN_CUSTOMER_ID).toBeTruthy();
    expect(ambiguous.emptyReasons.TEST_CUSTOMER_ID).toBeTruthy();

    const none = recommendSettings([]);
    expect(none.emptyReasons.DEFAULT_CUSTOMER_ID).toBeTruthy();
  });

  it('does not mark a filled-in value as empty', () => {
    const result = recommendSettings([real('1234567890'), real('5555555555', { isTest: true })]);
    expect(result.emptyReasons.DEFAULT_CUSTOMER_ID).toBeUndefined();
    expect(result.emptyReasons.TEST_CUSTOMER_ID).toBeUndefined();
  });

  it('sets LOGIN_CUSTOMER_ID to the manager the account was reached through', () => {
    const accounts = [real('1111111111', { isManager: true }), real('2222222222', { level: 1 })];
    const via = new Map([
      ['1111111111', '1111111111'],
      ['2222222222', '1111111111'],
    ]);
    const result = recommendSettings(accounts, via);
    expect(result.DEFAULT_CUSTOMER_ID).toBe('2222222222');
    expect(result.LOGIN_CUSTOMER_ID).toBe('1111111111');
    expect(result.notes.join(' ')).toContain('MCC');
  });

  it('never proposes a manager account as DEFAULT_CUSTOMER_ID', () => {
    const result = recommendSettings([real('1111111111', { isManager: true })]);
    expect(result.DEFAULT_CUSTOMER_ID).toBeUndefined();
    expect(result.notes.join(' ')).toContain('ไม่พบบัญชีโฆษณาจริง');
  });

  it('routes a test account to TEST_CUSTOMER_ID, not DEFAULT_CUSTOMER_ID', () => {
    const result = recommendSettings([real('1234567890'), real('5555555555', { isTest: true })]);
    expect(result.DEFAULT_CUSTOMER_ID).toBe('1234567890');
    expect(result.TEST_CUSTOMER_ID).toBe('5555555555');
  });

  it('refuses to guess when several real accounts qualify', () => {
    const result = recommendSettings([real('1234567890'), real('9876543210')]);
    expect(result.DEFAULT_CUSTOMER_ID).toBeUndefined();
    expect(result.notes.join(' ')).toContain('2 บัญชี');
  });

  it('warns when no test account exists, because M4 needs one', () => {
    expect(recommendSettings([real('1234567890')]).notes.join(' ')).toContain('test account');
  });

  it('ignores hidden and cancelled accounts', () => {
    const result = recommendSettings([
      real('1234567890'),
      real('9876543210', { isHidden: true }),
      real('5555555555', { status: 'CANCELED' }),
    ]);
    expect(result.DEFAULT_CUSTOMER_ID).toBe('1234567890');
  });

  it('flags a non-THB account', () => {
    const result = recommendSettings([real('1234567890', { currency: 'USD' })]);
    expect(result.notes.join(' ')).toContain('USD');
  });

  it('says nothing is reachable when the list is empty', () => {
    expect(recommendSettings([]).notes.join(' ')).toContain('ไม่พบบัญชีโฆษณาจริง');
  });
});
