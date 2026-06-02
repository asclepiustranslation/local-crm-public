// hooks/useBackup.js
// ASKLEPIUS CRM — Auto-Backup & Import/Restore Hook
// Tüm localStorage anahtarlarını okur, tarih damgalı JSON olarak indirir
// ve aynı JSON'u tekrar localStorage'a geri yükler.

import { useCallback } from "react";

// ─── Yedeklenecek localStorage anahtarları ────────────────────────────────────
// CRM'inizdeki tüm state'leri burada listeleyin.
// Eğer farklı key isimleri kullanıyorsanız bu diziyi güncelleyin.
const BACKUP_KEYS = [
  "contacts",        // Kişiler
  "companies",       // Şirketler
  "deals",           // Fırsatlar / Anlaşmalar
  "activities",      // Aktiviteler
  "notes",           // Notlar
  "reminders",       // Hatırlatıcılar
  "settings",        // Uygulama ayarları
  "gmailImports",    // Gmail'den aktarılan maillar
];

// ─── Tarih formatı: ASKLEPIUS_CRM_BACKUP_2026-06-02_16-13.json ────────────────
function buildFileName() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}`;
  return `ASKLEPIUS_CRM_BACKUP_${date}_${time}.json`;
}

// ─── Versiyon damgası: geri yüklemede uyumluluk kontrolü için ─────────────────
const BACKUP_VERSION = "1.0";

export function useBackup() {
  // ── EXPORT: Tüm veriyi JSON dosyası olarak indir ──────────────────────────
  const exportBackup = useCallback(() => {
    const snapshot = {
      _meta: {
        version: BACKUP_VERSION,
        createdAt: new Date().toISOString(),
        appName: "ASKLEPIUS CRM",
        keys: BACKUP_KEYS,
      },
      data: {},
    };

    BACKUP_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      try {
        snapshot.data[key] = raw ? JSON.parse(raw) : null;
      } catch {
        // JSON parse hatası — ham string olarak sakla
        snapshot.data[key] = raw;
      }
    });

    const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    return snapshot._meta.createdAt; // isteğe bağlı: son yedek zamanı için
  }, []);

  // ── IMPORT/RESTORE: JSON dosyasından localStorage'a geri yükle ───────────
  // onSuccess(restoredKeys): başarıyla yüklenen key listesini döner
  // onError(message)       : hata mesajı döner
  const importBackup = useCallback((file, { onSuccess, onError } = {}) => {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);

        // ── Temel format doğrulama ────────────────────────────────────────
        if (!parsed._meta || !parsed.data) {
          onError?.("Geçersiz yedek dosyası: '_meta' veya 'data' alanı bulunamadı.");
          return;
        }
        if (parsed._meta.appName !== "ASKLEPIUS CRM") {
          onError?.("Bu dosya farklı bir uygulamaya ait. Yükleme iptal edildi.");
          return;
        }

        // ── Versiyon kontrolü (ileride migrasyon için yer açar) ───────────
        if (parsed._meta.version !== BACKUP_VERSION) {
          console.warn(
            `[ASKLEPIUS Backup] Farklı versiyon: dosya=${parsed._meta.version}, beklenen=${BACKUP_VERSION}`
          );
          // Şimdilik yine de yüklemeye devam et; ileride migrasyon eklenebilir.
        }

        // ── localStorage'a yaz ────────────────────────────────────────────
        const restoredKeys = [];
        Object.entries(parsed.data).forEach(([key, value]) => {
          if (value === null || value === undefined) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(
              key,
              typeof value === "string" ? value : JSON.stringify(value)
            );
            restoredKeys.push(key);
          }
        });

        onSuccess?.(restoredKeys, parsed._meta);
      } catch (err) {
        onError?.(`JSON ayrıştırma hatası: ${err.message}`);
      }
    };

    reader.onerror = () => onError?.("Dosya okuma hatası.");
    reader.readAsText(file, "UTF-8");
  }, []);

  return { exportBackup, importBackup };
}
