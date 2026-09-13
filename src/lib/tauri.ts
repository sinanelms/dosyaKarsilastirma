import { isTauri as detectTauri } from '@tauri-apps/api/core';

/** Uygulama Tauri masaüstü penceresinde mi çalışıyor? (tarayıcıda `npm run dev` ile false) */
export const isTauri = (): boolean => {
  try {
    return detectTauri();
  } catch {
    return false;
  }
};

export interface SaveFilter {
  name: string;
  extensions: string[];
}

/**
 * İkili dosyayı kaydeder.
 * - Tauri: "Farklı Kaydet" penceresi + fs eklentisi. Kullanıcı iptal ederse `false` döner.
 * - Tarayıcı: indirme bağlantısı.
 */
export const saveBinaryFile = async (
  defaultName: string,
  data: ArrayBuffer | Uint8Array,
  filter: SaveFilter
): Promise<boolean> => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);

  if (isTauri()) {
    const [{ save }, { writeFile }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-fs'),
    ]);
    const path = await save({ defaultPath: defaultName, filters: [filter] });
    if (!path) return false;
    await writeFile(path, bytes);
    return true;
  }

  const blob = new Blob([bytes as BlobPart]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = defaultName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
};

/** Dosya adında kullanılabilecek bugünün yerel tarihi: 2026-09-14 (toISOString UTC olduğundan gece yarısı kayar). */
export const todayStamp = (date = new Date()): string =>
  [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
