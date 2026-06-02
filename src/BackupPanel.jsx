// BackupPanel.jsx
// ASKLEPIUS CRM — Yedekleme & Geri Yükleme Paneli
// Kullanım: App.jsx içindeki ayarlar/sidebar bölümüne ekleyin.

import { useState, useRef } from "react";
import { useBackup } from "../hooks/useBackup"; // yolu projenize göre ayarlayın

export default function BackupPanel({ onRestoreComplete }) {
  const { exportBackup, importBackup } = useBackup();
  const fileInputRef = useRef(null);

  const [status, setStatus] = useState(null);
  // status: null | { type: "success"|"error"|"info", message: string }

  const [lastBackupTime, setLastBackupTime] = useState(() => {
    return localStorage.getItem("_lastBackupTime") || null;
  });

  // ── Yedek İndir ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const timestamp = exportBackup();
    localStorage.setItem("_lastBackupTime", timestamp);
    setLastBackupTime(timestamp);
    setStatus({ type: "success", message: "Yedek başarıyla indirildi." });
    setTimeout(() => setStatus(null), 4000);
  };

  // ── Dosya Seç & Yükle ──────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Sadece .json dosyaları
    if (!file.name.endsWith(".json")) {
      setStatus({ type: "error", message: "Lütfen bir .json yedek dosyası seçin." });
      return;
    }

    setStatus({ type: "info", message: "Dosya okunuyor…" });

    importBackup(file, {
      onSuccess: (restoredKeys, meta) => {
        setStatus({
          type: "success",
          message: `✓ ${restoredKeys.length} alan geri yüklendi. (Yedek tarihi: ${
            meta.createdAt ? new Date(meta.createdAt).toLocaleString("tr-TR") : "?"
          })`,
        });
        // input'u sıfırla
        if (fileInputRef.current) fileInputRef.current.value = "";
        // Sayfayı yenile: localStorage güncellendiği için React state'leri resetlenmeli
        onRestoreComplete?.();
      },
      onError: (msg) => {
        setStatus({ type: "error", message: msg });
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  // ── Onaylı Geri Yükleme ────────────────────────────────────────────────────
  const handleRestoreClick = () => {
    const confirmed = window.confirm(
      "⚠️ Mevcut tüm CRM verisi silinip yedeğinizdeki verilerle değiştirilecek.\n\nDevam etmek istiyor musunuz?"
    );
    if (confirmed) fileInputRef.current?.click();
  };

  // ── Stil yardımcıları (Tailwind varsayımı) ─────────────────────────────────
  const statusColors = {
    success: "bg-green-50 border-green-400 text-green-800",
    error:   "bg-red-50 border-red-400 text-red-800",
    info:    "bg-blue-50 border-blue-400 text-blue-800",
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-5 max-w-md">
      <div>
        <h2 className="text-lg font-semibold text-gray-800">Veri Yedekleme</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tüm CRM verinizi tek bir JSON dosyasına aktarın veya daha önce oluşturduğunuz bir
          yedekten geri yükleyin.
        </p>
      </div>

      {/* Son yedek zamanı */}
      {lastBackupTime && (
        <p className="text-xs text-gray-400">
          Son yedek:{" "}
          <span className="font-medium text-gray-600">
            {new Date(lastBackupTime).toLocaleString("tr-TR")}
          </span>
        </p>
      )}

      {/* Durum mesajı */}
      {status && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${statusColors[status.type]}`}
        >
          {status.message}
        </div>
      )}

      {/* Butonlar */}
      <div className="flex gap-3 flex-wrap">
        {/* Export */}
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          ⬇ Yedeği İndir
        </button>

        {/* Import */}
        <button
          onClick={handleRestoreClick}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition"
        >
          ↩ Yedekten Geri Yükle
        </button>
      </div>

      {/* Gizli file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Bilgi notu */}
      <p className="text-xs text-gray-400 leading-relaxed">
        Dosya adı formatı: <code className="text-gray-600">ASKLEPIUS_CRM_BACKUP_YYYY-MM-DD_HH-MM.json</code>
        <br />
        Geri yükleme mevcut veriyi tamamen değiştirir — önce mutlaka yedek alın.
      </p>
    </div>
  );
}
