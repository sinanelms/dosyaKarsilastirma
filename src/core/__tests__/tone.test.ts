import { describe, expect, it } from 'vitest';
import { roleTone, statusTone } from '../tone';

describe('roleTone', () => {
  it('şüpheli/sanık kırmızı, müşteki/mağdur mavi, tanık turuncu, diğerleri nötr', () => {
    expect(roleTone('Şüpheli')).toBe('danger');
    expect(roleTone('SANIK')).toBe('danger');
    expect(roleTone('Müşteki Şüpheli')).toBe('danger');
    expect(roleTone('Mağdur')).toBe('info');
    expect(roleTone('Katılan')).toBe('info');
    expect(roleTone('Tanık')).toBe('warning');
    expect(roleTone('Vasi')).toBe('neutral');
  });
});

describe('statusTone', () => {
  it('açık/derdest yeşil, kapalı/kesinleşmiş kırmızı', () => {
    expect(statusTone('Açık')).toBe('success');
    expect(statusTone('AÇIK')).toBe('success');
    expect(statusTone('Kapalı')).toBe('danger');
    expect(statusTone('İstinafta')).toBe('neutral');
  });
});
