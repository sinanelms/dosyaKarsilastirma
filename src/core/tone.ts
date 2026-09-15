/** Sıfat ve dosya durumu etiketlerinin anlam rengi; sonuç tablosu ile PDF aynı kuralı kullanır. */
export type Tone = 'danger' | 'info' | 'warning' | 'success' | 'neutral';

const lower = (value: string) => value.toLocaleLowerCase('tr-TR');

export const roleTone = (role: string): Tone => {
  const r = lower(role);
  if (r.includes('şüpheli') || r.includes('sanık') || r.includes('ssç') || r.includes('suça sürüklenen')) return 'danger';
  if (r.includes('müşteki') || r.includes('mağdur') || r.includes('katılan')) return 'info';
  if (r.includes('tanık')) return 'warning';
  return 'neutral';
};

export const statusTone = (status: string): Tone => {
  const s = lower(status);
  if (s.includes('açık') || s.includes('derdest')) return 'success';
  if (s.includes('kapalı') || s.includes('kesinleş')) return 'danger';
  return 'neutral';
};
