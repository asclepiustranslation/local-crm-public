// src/BackupPanel.jsx
// ASKLEPIUS CRM — Tailwind YOK, tamamen inline style
import { useState, useRef } from "react";
import { useBackup } from "./useBackup";

export default function BackupPanel({ onRestoreComplete }) {
  const { exportBackup, importBackup } = useBackup();
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState(null);
  const [lastBackupTime, setLastBackupTime] = useState(
    () => localStorage.getItem("_lastBackupTime") || null
  );

  const handleExport = () => {
    const timestamp = exportBackup();
    localStorage.setItem("_lastBackupTime", timestamp);
    setLastBackupTime(timestamp);
    setStatus({ type: "success", message: "Yedek başarıyla indirildi." });
    setTimeout(() => setStatus(null), 4000);
  };

  const handleRestoreClick = () => {
    const confirmed = window.confirm(
      "⚠️ Mevcut tüm CRM verisi silinip yedeğinizdeki verilerle değiştirilecek.\n\nDevam etmek istiyor musunuz?"
    );
    if (confirmed) fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        if (fileInputRef.current) fileInputRef.current.value = "";
        onRestoreComplete?.();
      },
      onError: (msg) => {
        setStatus({ type: "error", message: msg });
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  const statusStyle = {
    success: { background: "#f0fdf4", border: "1px solid #86efac", color: "#166534" },
    error:   { background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b" },
    info:    { background: "#eff6ff", border: "1px solid #93c5fd", color: "#1e40af" },
  };

  return (
    <div style={{
      background: "#fff",
      borderRadius: 12,
      boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
      padding: "20px 24px",
      marginBottom: 24,
    }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1f2937", marginBottom: 4 }}>
          Veri Yedekleme
        </div>
        <div style={{ fontSize: 13, color: "#6b7280" }}>
          Tüm CRM verinizi tek JSON dosyasına aktarın veya daha önce oluşturduğunuz bir yedekten geri yükleyin.
        </div>
      </div>

      {lastBackupTime && (
        <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>
          Son yedek:{" "}
          <span style={{ fontWeight: 600, color: "#6b7280" }}>
            {new Date(lastBackupTime).toLocaleString("tr-TR")}
          </span>
        </div>
      )}

      {status && (
        <div style={{
          ...statusStyle[status.type],
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: 13,
          fontWeight: 500,
          marginBottom: 12,
        }}>
          {status.message}
        </div>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button
          onClick={handleExport}
          style={{
            background: "#8A6322",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ⬇ Yedeği İndir
        </button>

        <button
          onClick={handleRestoreClick}
          style={{
            background: "#d97706",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "9px 18px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ↩ Yedekten Geri Yükle
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, lineHeight: 1.6 }}>
        Dosya adı: <code style={{ color: "#6b7280" }}>ASKLEPIUS_CRM_BACKUP_YYYY-MM-DD_HH-MM.json</code>
        <br />
        Geri yükleme mevcut veriyi tamamen değiştirir — önce mutlaka yedek alın.
      </div>
    </div>
  );
}
