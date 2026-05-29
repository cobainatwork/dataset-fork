const { extractConditionFingerprint } = require('@/lib/services/embedding/condition-fingerprint');

describe('extractConditionFingerprint', () => {
  it('returns null for plain narrative without condition tokens', () => {
    expect(extractConditionFingerprint('依本保單條款，要保人如何辦理退保並取得退還保費？')).toBeNull();
  });

  it('extracts payment-term: 躉繳', () => {
    expect(extractConditionFingerprint('依躉繳方式投保金福利，保費折扣率為何？')).toBe('term=躉繳');
  });

  it('extracts payment-term: N 年期', () => {
    expect(extractConditionFingerprint('依 2 年期繳費方式投保金福利，保費折扣率為何？')).toBe('term=2年');
  });

  it('extracts amount range: 50 萬 - 100 萬', () => {
    expect(extractConditionFingerprint('新臺幣 50 萬元(含)至 100 萬元(不含)的年繳保費')).toBe('amount=50w-100w');
  });

  it('extracts amount open range: 100 萬以上', () => {
    expect(extractConditionFingerprint('新臺幣 100 萬元(含)以上的年繳保費')).toBe('amount=100w+');
  });

  it('extracts age band: 56-70 歲', () => {
    expect(extractConditionFingerprint('依年齡 56~70 歲申請金滿利的免體檢額度上限')).toBe('age=56-70');
  });

  it('extracts occupation class: 第一類', () => {
    expect(extractConditionFingerprint('依職業等級第一類申請傷害險的核保條件')).toBe('occ=1');
  });

  it('extracts and sorts multiple tokens', () => {
    const fp = extractConditionFingerprint('依躉繳方式投保金福利，新臺幣 50 萬元(含)至 100 萬元(不含)的年繳保費適用之折扣率');
    expect(fp).toBe('amount=50w-100w|term=躉繳');
  });

  it('handles full-width digits', () => {
    expect(extractConditionFingerprint('依 ２ 年期投保金福利')).toBe('term=2年');
  });

  it('truncates excessively long canonical strings', () => {
    const longText = '依躉繳依 1 年期依 2 年期依 3 年期'.repeat(20);
    const fp = extractConditionFingerprint(longText);
    expect(fp).toBeTruthy();
    expect(fp.length).toBeLessThanOrEqual(200);
  });
});
