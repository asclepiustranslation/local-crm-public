import React, { useEffect, useMemo, useState } from "react";
import { googleLogout, useGoogleLogin } from "@react-oauth/google";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import BackupPanel from "./BackupPanel";

const LS_COMPANIES = "asklepius-companies";
const LS_CONTACTS = "asklepius-contacts";
const LS_DEALS = "asklepius-deals";
const LS_PROJECTS = "asklepius-projects";
const LS_ACTIVITIES = "asklepius-activities";
const LS_EXPENSES = "asklepius-expenses";
const LS_GOOGLE_AUTH = "googleAuth";
const LS_GMAIL_AUTH = "gmailAuth";

const dealStatuses = [
  "closed won",
  "reservasyon",
  "reservasyonlu",
  "işlemde",
  "ödeme bekleniyor",
  "kayıp/iptal",
];

const activityTypes = ["note", "email", "call", "meeting", "task", "status-change"];
const COLORS = ["#57C4E5", "#E0A23F", "#8A6322", "#2B2B2B", "#C98B2E", "#B8DDEB"];

const seedCompanies = [
  {
    id: crypto.randomUUID(),
    companyName: "ABC Çeviri",
    billingCity: "İstanbul",
    phone: "+90 212 000 0000",
    mobile: "+90 533 000 0000",
    email: "info@abc.com",
    nextStep: "Teklif gönder",
    lastActivity: "2026-05-20",
    owner: "Ayşe",
    contactIds: [],
    createdAt: new Date().toISOString(),
  },
];

const seedContacts = [
  {
    id: crypto.randomUUID(),
    fullName: "Mehmet Yılmaz",
    company: "ABC Çeviri",
    companyIds: [],
    jobTitle: "Proje Yöneticisi",
    mobile: "+90 532 111 2233",
    business: "+90 212 000 0001",
    email1: "mehmet@abc.com",
    cityBusiness: "İstanbul",
    nextStep: "Geri dönüş bekleniyor",
    lastActivity: "2026-05-21",
    owner: "Ayşe",
    createdAt: new Date().toISOString(),
  },
];

const seedDeals = [
  {
    id: crypto.randomUUID(),
    customer: "ABC Çeviri",
    contactPerson: "Mehmet Yılmaz",
    name: "Web sitesi lokalizasyonu",
    dateReceived: "2026-05-10",
    status: "işlemde",
    estRevenue: 4500,
    estCloseDate: "2026-05-30",
    note: "",
    projectId: "",
    createdAt: new Date().toISOString(),
  },
];

const seedProjects = [
  {
    id: crypto.randomUUID(),
    company: "ABC Çeviri",
    contactPerson: "Mehmet Yılmaz",
    name: "Website TR-EN Project",
    status: "işlemde",
    startDate: "2026-05-12",
    dueDate: "2026-05-28",
    estRevenue: 4500,
    owner: "Ayşe",
    note: "",
    description: "",
    updates: [],
    dealIds: [],
    createdAt: new Date().toISOString(),
  },
];

const seedActivities = [
  {
    id: crypto.randomUUID(),
    entityType: "deal",
    entityId: seedDeals[0].id,
    type: "note",
    subject: "İlk görüşme notu",
    body: "Müşteri teklif istedi.",
    direction: "internal",
    status: "done",
    relatedCompanyId: null,
    relatedContactId: null,
    relatedDealId: seedDeals[0].id,
    relatedProjectId: null,
    createdAt: new Date().toISOString(),
    createdBy: "Ayşe",
    source: "manual",
  },
];

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function money(n) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function parseCSVLine(text) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((s) => s.trim());
}

function parseDate(val) {
  if (!val) return "";
  // "2024-05-05 00:00:00" → "2024-05-05"
  return String(val).trim().slice(0, 10);
}

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/[()\.]/g, "")
    .replace(/[^a-z0-9ğüşöçıİĞÜŞÖÇ]+/gi, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseCSV(content) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = parseCSVLine(lines[0]).map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const values = parseCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = values[i] ?? "";
    });
    return obj;
  });
}

function firstNonEmpty(...vals) {
  return vals.find((v) => String(v ?? "").trim() !== "") ?? "";
}

function decodeBase64Url(data) {
  if (!data) return "";
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return decodeURIComponent(
      Array.from(atob(padded))
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );
  } catch {
    try {
      return atob(data.replace(/-/g, "+").replace(/_/g, "/"));
    } catch {
      return "";
    }
  }
}

function extractMessageBody(payload) {
  if (!payload) return "";
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  if (payload.mimeType === "text/html" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  const parts = payload.parts || [];
  for (const part of parts) {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
  }
  for (const part of parts) {
    if (part.mimeType === "text/html" && part.body?.data) {
      return decodeBase64Url(part.body.data);
    }
    if (part.parts?.length) {
      const nested = extractMessageBody(part);
      if (nested) return nested;
    }
  }
  return payload.body?.data ? decodeBase64Url(payload.body.data) : "";
}

function byDateRange(items, key, from, to) {
  return items.filter((x) => {
    const d = String(x[key] || "").slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

function Stat({ label, value }) {
  return (
    <div style={styles.stat}>
      <div style={styles.statLabel}>{label}</div>
      <div style={styles.statValue}>{value}</div>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section style={styles.panel}>
      <h2 style={styles.h2}>{title}</h2>
      {children}
    </section>
  );
}

function Card({ children }) {
  return <div style={styles.card}>{children}</div>;
}

function InputField({ label, value, onChange, type = "text" }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
    </label>
  );
}

export default function App() {
  const [companies, setCompanies] = useState(loadLS(LS_COMPANIES, seedCompanies));
  const [contacts, setContacts] = useState(loadLS(LS_CONTACTS, seedContacts));
  const [deals, setDeals] = useState(loadLS(LS_DEALS, seedDeals));
  const [projects, setProjects] = useState(loadLS(LS_PROJECTS, seedProjects));
  const [activities, setActivities] = useState(loadLS(LS_ACTIVITIES, seedActivities));
  const [expenses, setExpenses] = useState(loadLS(LS_EXPENSES, []));

  const [view, setView] = useState("dashboard");
  const [selectedEntityType, setSelectedEntityType] = useState("deal");
  const [selectedEntityId, setSelectedEntityId] = useState(seedDeals[0]?.id || "");
  const [activeDetailType, setActiveDetailType] = useState("deal");
  const [activeDetailId, setActiveDetailId] = useState(seedDeals[0]?.id || "");

  const [activityFilter, setActivityFilter] = useState("all");
  const [activityFrom, setActivityFrom] = useState("");
  const [activityTo, setActivityTo] = useState("");

  const [statusFilter, setStatusFilter] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("2026");
  const [monthFilter, setMonthFilter] = useState("");
  const [search, setSearch] = useState("");

  const [reportStatusFilter, setReportStatusFilter] = useState("");
  const [reportCompanyFilter, setReportCompanyFilter] = useState("");
  const [reportContactFilter, setReportContactFilter] = useState("");
  const [reportYearFilter, setReportYearFilter] = useState("");
  const [reportMonthFilter, setReportMonthFilter] = useState("");
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");

  const [expenseDateFrom, setExpenseDateFrom] = useState("");
  const [expenseDateTo, setExpenseDateTo] = useState("");
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState("");
  const [expenseTypeFilter, setExpenseTypeFilter] = useState("");
  const [expenseRecognitionFilter, setExpenseRecognitionFilter] = useState("");
  // Muhasebe raporu ek filtreleri
  const [accYearFilter, setAccYearFilter] = useState("");
  const [accMonthFilter, setAccMonthFilter] = useState("");
  const [accCompanyFilter, setAccCompanyFilter] = useState("");
  const [accContactFilter, setAccContactFilter] = useState("");

  const [importMessage, setImportMessage] = useState("");
  const [contactSearch, setContactSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [previousView, setPreviousView] = useState("dashboard");
  const [editState, setEditState] = useState({ type: null, item: null });

  const [activityForm, setActivityForm] = useState({
    type: "note",
    subject: "",
    body: "",
    direction: "internal",
    status: "done",
    createdBy: "Ayşe",
  });

  const [expenseForm, setExpenseForm] = useState({
    title: "",
    category: "other",
    customCategory: "",
    amount: "",
    date: "",
    type: "one-time",
    cycle: "monthly",
    recognition: "cash",
    spreadMonths: 12,
    note: "",
  });

  const [openForms, setOpenForms] = useState({
    company: false,
    contact: false,
    deal: false,
    project: false,
  });

  const [confirmState, setConfirmState] = useState({
    open: false,
    message: "",
    onConfirm: null,
  });

  const [companyForm, setCompanyForm] = useState({
    companyName: "",
    billingCity: "",
    phone: "",
    email: "",
    contactIds: [],
  });

  const [contactForm, setContactForm] = useState({
    fullName: "",
    jobTitle: "",
    mobile: "",
    email1: "",
    companyIds: [],
  });

  const [dealForm, setDealForm] = useState({
    name: "",
    customerId: "",
    contactPersonId: "",
    dateReceived: "",
    status: "reservasyonlu",
    estRevenue: "",
    estCloseDate: "",
    note: "",
    projectId: "",
  });

  const [projectForm, setProjectForm] = useState({
    name: "",
    companyId: "",
    contactPersonId: "",
    status: "işlemde",
    startDate: "",
    dueDate: "",
    estRevenue: "",
    owner: "",
    note: "",
    description: "",
  });

  const [projectUpdateForm, setProjectUpdateForm] = useState({
    date: "",
    note: "",
  });

  const [googleAuth, setGoogleAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_GOOGLE_AUTH) || "null");
    } catch {
      return null;
    }
  });
  const [googleContacts, setGoogleContacts] = useState([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [gmailAuth, setGmailAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_GMAIL_AUTH) || "null");
    } catch {
      return null;
    }
  });
  const [gmailLoading, setGmailLoading] = useState(false);
  const [gmailError, setGmailError] = useState("");
  const [gmailMessages, setGmailMessages] = useState([]);
  const [gmailQuery, setGmailQuery] = useState("newer_than:30d");
  const [gmailLabelFilter, setGmailLabelFilter] = useState("INBOX");
  const [selectedGmailMessage, setSelectedGmailMessage] = useState(null);
  const [mailImportTarget, setMailImportTarget] = useState({ entityType: "contact", entityId: "" });

  useEffect(() => saveLS(LS_COMPANIES, companies), [companies]);
  useEffect(() => saveLS(LS_CONTACTS, contacts), [contacts]);
  useEffect(() => saveLS(LS_DEALS, deals), [deals]);
  useEffect(() => saveLS(LS_PROJECTS, projects), [projects]);
  useEffect(() => saveLS(LS_ACTIVITIES, activities), [activities]);
  useEffect(() => saveLS(LS_EXPENSES, expenses), [expenses]);

  useEffect(() => {
    if (googleAuth) {
      localStorage.setItem(LS_GOOGLE_AUTH, JSON.stringify(googleAuth));
    } else {
      localStorage.removeItem(LS_GOOGLE_AUTH);
    }
  }, [googleAuth]);

  useEffect(() => {
    if (gmailAuth) {
      localStorage.setItem(LS_GMAIL_AUTH, JSON.stringify(gmailAuth));
    } else {
      localStorage.removeItem(LS_GMAIL_AUTH);
    }
  }, [gmailAuth]);

  const fetchGoogleContacts = async (accessToken) => {
    try {
      setGoogleLoading(true);
      setGoogleError("");
      const res = await fetch(
        "https://people.googleapis.com/v1/people/me/connections?pageSize=1000&personFields=names,emailAddresses",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!res.ok) throw new Error("Google Contacts okunamadı");
      const data = await res.json();
      const mapped = (data.connections || []).map((person) => ({
        resourceName: person.resourceName,
        name: person.names?.[0]?.displayName || "",
        email: person.emailAddresses?.[0]?.value || "",
      }));
      setGoogleContacts(mapped);
    } catch {
      setGoogleError("Google kişi eşleştirmesi alınamadı.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    try {
      setGoogleLoading(true);
      setGoogleError("");
      const token = tokenResponse?.access_token;
      if (!token) throw new Error("Access token alınamadı");
      const data = {
        accessToken: token,
        connectedAt: new Date().toISOString(),
        scope: tokenResponse?.scope || "",
        tokenType: tokenResponse?.token_type || "Bearer",
      };
      setGoogleAuth(data);
      await fetchGoogleContacts(token);
    } catch {
      setGoogleError("Google hesabı bağlanamadı.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const connectGoogleContacts = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/contacts.readonly",
    flow: "implicit",
    onSuccess: handleGoogleSuccess,
    onError: () => setGoogleError("Google ile giriş başarısız oldu."),
  });

  const handleGoogleDisconnect = () => {
    googleLogout();
    setGoogleAuth(null);
    setGoogleContacts([]);
    setGoogleError("");
  };

  const fetchGmailMessages = async (accessToken = gmailAuth?.accessToken, query = gmailQuery, label = gmailLabelFilter) => {
    try {
      setGmailLoading(true);
      setGmailError("");
      if (!accessToken) throw new Error("Gmail access token bulunamadı");

      // Tüm sayfaları nextPageToken ile çek
      let messages = [];
      let pageToken = null;
      do {
        const params = new URLSearchParams();
        params.set("maxResults", "500");
        if (query) params.set("q", query);
        if (label) params.set("labelIds", label);
        if (pageToken) params.set("pageToken", pageToken);
        const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!listRes.ok) throw new Error("Gmail mesaj listesi alınamadı");
        const listData = await listRes.json();
        messages = messages.concat(listData.messages || []);
        pageToken = listData.nextPageToken || null;
      } while (pageToken);

      const details = await Promise.all(
        messages.map(async (m) => {
          const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!res.ok) return null;
          const data = await res.json();
          const headers = Object.fromEntries((data.payload?.headers || []).map((h) => [h.name, h.value]));
          const snippet = data.snippet || "";
          const body = extractMessageBody(data.payload || {});
          const from = headers.From || "";
          const to = headers.To || "";
          const subject = headers.Subject || "(Konu yok)";
          const date = headers.Date || "";
          const emailMatch = (from.match(/<([^>]+)>/) || [])[1] || from;
          const cleanEmail = String(emailMatch || "").trim().toLowerCase();
          const suggestedContact = contacts.find((c) => String(c.email1 || "").trim().toLowerCase() === cleanEmail) || null;
          const suggestedCompany = suggestedContact
            ? companies.find((co) => co.companyName === suggestedContact.company) || null
            : companies.find((co) => String(co.email || "").trim().toLowerCase() === cleanEmail) || null;
          const suggestedDeal = suggestedContact
            ? deals.find((d) => d.contactPerson === suggestedContact.fullName) || null
            : suggestedCompany
            ? deals.find((d) => d.customer === suggestedCompany.companyName) || null
            : null;
          return {
            id: data.id,
            threadId: data.threadId,
            snippet,
            body,
            from,
            to,
            subject,
            date,
            email: cleanEmail,
            labelIds: data.labelIds || [],
            suggestedContactId: suggestedContact?.id || "",
            suggestedCompanyId: suggestedCompany?.id || "",
            suggestedDealId: suggestedDeal?.id || "",
          };
        })
      );

      const finalMessages = details.filter(Boolean);
      setGmailMessages(finalMessages);
      if (finalMessages[0]) {
        setSelectedGmailMessage(finalMessages[0]);
        setMailImportTarget({
          entityType: finalMessages[0].suggestedContactId ? "contact" : finalMessages[0].suggestedCompanyId ? "company" : finalMessages[0].suggestedDealId ? "deal" : "contact",
          entityId: finalMessages[0].suggestedContactId || finalMessages[0].suggestedCompanyId || finalMessages[0].suggestedDealId || "",
        });
      }
    } catch (err) {
      setGmailError("Gmail mesajları alınamadı.");
    } finally {
      setGmailLoading(false);
    }
  };

  const handleGmailSuccess = async (tokenResponse) => {
    try {
      const token = tokenResponse?.access_token;
      if (!token) throw new Error("Gmail access token alınamadı");
      const data = {
        accessToken: token,
        connectedAt: new Date().toISOString(),
        scope: tokenResponse?.scope || "",
        tokenType: tokenResponse?.token_type || "Bearer",
      };
      setGmailAuth(data);
      await fetchGmailMessages(token, gmailQuery, gmailLabelFilter);
    } catch {
      setGmailError("Gmail hesabı bağlanamadı.");
    }
  };

  const connectGmail = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    flow: "implicit",
    onSuccess: handleGmailSuccess,
    onError: () => setGmailError("Gmail bağlantısı başarısız oldu."),
  });

  const handleGmailDisconnect = () => {
    googleLogout();
    setGmailAuth(null);
    setGmailMessages([]);
    setSelectedGmailMessage(null);
    setGmailError("");
  };

  const importGmailMessageToCRM = (message, target) => {
    if (!message || !target?.entityId || !target?.entityType) return;
    const rec = {
      id: crypto.randomUUID(),
      entityType: target.entityType,
      entityId: target.entityId,
      type: "email",
      subject: message.subject,
      body: `Kimden: ${message.from}
Kime: ${message.to}
Tarih: ${message.date}

Mesaj:
${message.body || message.snippet}`,
      direction: message.labelIds?.includes("SENT") ? "outgoing" : "incoming",
      status: "done",
      relatedCompanyId: target.entityType === "company" ? target.entityId : null,
      relatedContactId: target.entityType === "contact" ? target.entityId : null,
      relatedDealId: target.entityType === "deal" ? target.entityId : null,
      relatedProjectId: target.entityType === "project" ? target.entityId : null,
      createdAt: message.date ? new Date(message.date).toISOString() : new Date().toISOString(),
      createdBy: "Gmail Import",
      source: "gmail-manual",
    };
    setActivities((prev) => [rec, ...prev]);
    setImportMessage(`Mail CRM'e aktarıldı: ${message.subject}`);
  };

  const deleteActivity = (id) => {
    if (window.confirm("Bu aktiviteyi silmek istediğinize emin misiniz?")) {
      setActivities((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const enrichedContacts = useMemo(
    () =>
      contacts.map((contact) => {
        const match = googleContacts.find(
          (g) =>
            g.email &&
            contact.email1 &&
            g.email.trim().toLowerCase() === contact.email1.trim().toLowerCase()
        );
        return {
          ...contact,
          googleMatched: Boolean(match),
          googleName: match?.name || "",
          googleEmail: match?.email || "",
        };
      }),
    [contacts, googleContacts]
  );

  const selectedList = useMemo(() => {
    if (selectedEntityType === "company") return companies;
    if (selectedEntityType === "contact") return contacts;
    if (selectedEntityType === "project") return projects;
    return deals;
  }, [selectedEntityType, companies, contacts, projects, deals]);

  useEffect(() => {
    if (!selectedEntityId && selectedList[0]?.id) {
      setSelectedEntityId(selectedList[0].id);
    }
  }, [selectedEntityId, selectedList]);

  const activeItems = useMemo(() => {
    if (activeDetailType === "company") return companies;
    if (activeDetailType === "contact") return contacts;
    if (activeDetailType === "project") return projects;
    return deals;
  }, [activeDetailType, companies, contacts, projects, deals]);

  const activeRecord = useMemo(
    () => activeItems.find((x) => x.id === activeDetailId) || null,
    [activeItems, activeDetailId]
  );

  const relatedActivities = useMemo(() => {
    if (!activeDetailId) return [];
    return activities
      .filter((a) => a.entityType === activeDetailType && a.entityId === activeDetailId)
      .filter((a) => (activityFilter === "all" ? true : a.type === activityFilter))
      .filter((a) => (activityFrom ? a.createdAt.slice(0, 10) >= activityFrom : true))
      .filter((a) => (activityTo ? a.createdAt.slice(0, 10) <= activityTo : true))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [activities, activeDetailId, activeDetailType, activityFilter, activityFrom, activityTo]);

  const dealFiltered = useMemo(() => {
    return deals
      .filter((d) => (statusFilter ? d.status === statusFilter : true))
      .filter((d) => (companyFilter ? d.customer === companyFilter : true))
      .filter((d) => (contactFilter ? d.contactPerson === contactFilter : true))
      .filter((d) =>
        yearFilter ? String(new Date(d.dateReceived || d.createdAt).getFullYear()) === String(yearFilter) : true
      )
      .filter((d) => (monthFilter ? String(d.dateReceived || "").slice(0, 7) === monthFilter : true))
      .filter((d) => {
        if (!search) return true;
        const q = search.toLowerCase();
        return [d.customer, d.contactPerson, d.name, d.status].join(" ").toLowerCase().includes(q);
      })
      .slice()
      .sort((a, b) => {
        const dateA = String(a.estCloseDate || a.dateReceived || a.createdAt || "");
        const dateB = String(b.estCloseDate || b.dateReceived || b.createdAt || "");
        return dateB.localeCompare(dateA);
      });
  }, [deals, statusFilter, companyFilter, contactFilter, yearFilter, monthFilter, search]);

  const monthlyRevenue = useMemo(() => {
    const map = {};
    dealFiltered
      .filter((d) => d.status === "closed won")
      .forEach((d) => {
        const key = d.dateReceived?.slice(0, 7);
        if (!key) return;
        map[key] = (map[key] || 0) + Number(d.estRevenue || 0);
      });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));
  }, [dealFiltered]);

  const dealStatusPie = useMemo(() => {
    const map = {};
    dealFiltered.forEach((d) => {
      map[d.status] = (map[d.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [dealFiltered]);

  const dealStats = useMemo(() => {
    const won     = deals.filter((d) => d.status === "closed won");
    const pending = deals.filter((d) => ["işlemde", "ödeme bekleniyor"].includes(d.status)).length;
    const totalRevenue = deals
      .filter((d) => ["closed won", "reservasyon", "reservasyonlu", "reserved"].includes(d.status))
      .reduce((s, d) => s + Number(d.estRevenue || 0), 0);
    return { count: deals.length, wonCount: won.length, pending, totalRevenue };
  }, [deals]);

  const reservedDeals = useMemo(
    () => deals
      .filter((d) => ["reservasyonlu", "reserved", "reservasyon"].includes(d.status))
      .slice()
      .sort((a, b) => {
        // En yakın kapanış tarihi üstte
        const dateA = String(a.estCloseDate || a.dateReceived || a.createdAt || "");
        const dateB = String(b.estCloseDate || b.dateReceived || b.createdAt || "");
        return dateA.localeCompare(dateB);
      }),
    [deals]
  );

  const reportDeals = useMemo(() => {
    return deals
      .filter((d) => (reportStatusFilter ? d.status === reportStatusFilter : true))
      .filter((d) => (reportCompanyFilter ? d.customer === reportCompanyFilter : true))
      .filter((d) => (reportContactFilter ? d.contactPerson === reportContactFilter : true))
      .filter((d) => {
        if (!reportYearFilter) return true;
        const year = new Date(d.dateReceived || d.createdAt).getFullYear();
        return String(year) === String(reportYearFilter);
      })
      .filter((d) => (!reportMonthFilter ? true : String(d.dateReceived || "").slice(0, 7) === reportMonthFilter))
      .filter((d) => (reportFromDate ? d.dateReceived >= reportFromDate : true))
      .filter((d) => (reportToDate ? d.dateReceived <= reportToDate : true));
  }, [
    deals,
    reportStatusFilter,
    reportCompanyFilter,
    reportContactFilter,
    reportYearFilter,
    reportMonthFilter,
    reportFromDate,
    reportToDate,
  ]);

  const reportMonthlyRevenue = useMemo(() => {
    const map = {};
    reportDeals
      .filter((d) => ["closed won", "reservasyon", "reservasyonlu", "reserved"].includes(d.status))
      .forEach((d) => {
        const month = String(d.dateReceived || d.estCloseDate || d.createdAt || "").slice(0, 7);
        if (!month) return;
        map[month] = (map[month] || 0) + Number(d.estRevenue || 0);
      });
    return Object.entries(map)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([name, value]) => ({ name, value }));
  }, [reportDeals]);

  const reportDealStatusPie = useMemo(() => {
    const map = {};
    reportDeals.forEach((d) => {
      const key = d.status || "belirsiz";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [reportDeals]);

  const accountingRows = useMemo(() => {
    const dealIncomeRows = deals
      .filter((d) => d.status === "closed won" || d.status === "reserved" || d.status === "reservasyon" || d.status === "reservasyonlu")
      .map((d) => ({
        id: `deal-${d.id}`,
        date: d.dateReceived || d.estCloseDate || d.createdAt,
        amount: Number(d.estRevenue || 0),
        source: "deal",
        status: d.status,
        title: d.name,
        customer: d.customer,
        kind:
          d.status === "reserved" || d.status === "reservasyon" || d.status === "reservasyonlu"
            ? "pendingIncome"
            : "realizedIncome",
        spreadMonths: 1,
      }));

    const projectIncomeRows = projects
      .filter((p) => Number(p.estRevenue || 0) > 0)
      .map((p) => ({
        id: `project-${p.id}`,
        date: p.startDate || p.dueDate || p.createdAt,
        amount: Number(p.estRevenue || 0),
        source: "project",
        status: p.status,
        title: p.name,
        customer: p.company,
        kind: "realizedIncome",
        spreadMonths: 1,
      }));

    const expenseRows = expenses.map((e) => ({
      id: `expense-${e.id}`,
      date: e.date,
      amount: Number(e.amount || 0),
      source: "expense",
      category: e.category,
      title: e.title,
      kind: "expense",
      recognition: e.recognition || "cash",
      spreadMonths: Number(e.spreadMonths || 1),
      cycle: e.cycle || "",
      note: e.note || "",
    }));

    return [...dealIncomeRows, ...projectIncomeRows, ...expenseRows]
      .filter((r) => (expenseDateFrom ? r.date >= expenseDateFrom : true))
      .filter((r) => (expenseDateTo ? r.date <= expenseDateTo : true))
      .filter((r) => (expenseCategoryFilter ? r.category === expenseCategoryFilter : true))
      .filter((r) => (expenseTypeFilter ? r.kind === expenseTypeFilter || r.source === expenseTypeFilter : true))
      .filter((r) => (expenseRecognitionFilter ? r.recognition === expenseRecognitionFilter : true))
      .filter((r) => (accYearFilter ? String(r.date || "").slice(0, 4) === accYearFilter : true))
      .filter((r) => (accMonthFilter ? String(r.date || "").slice(0, 7) === accMonthFilter : true))
      .filter((r) => (accCompanyFilter ? r.customer === accCompanyFilter : true))
      .filter((r) => {
        if (!accContactFilter) return true;
        // Kişi filtresi: deal veya proje'deki contactPerson alanına bak
        const deal = deals.find((d) => `deal-${d.id}` === r.id);
        if (deal) return deal.contactPerson === accContactFilter;
        return true;
      });
  }, [
    deals,
    projects,
    expenses,
    expenseDateFrom,
    expenseDateTo,
    expenseCategoryFilter,
    expenseTypeFilter,
    expenseRecognitionFilter,
    accYearFilter,
    accMonthFilter,
    accCompanyFilter,
    accContactFilter,
  ]);

  const monthlyProfitLoss = useMemo(() => {
    const months = {};
    const ensure = (key) => {
      if (!months[key]) months[key] = { realizedIncome: 0, pendingIncome: 0, expenseSpread: 0, expenseCash: 0 };
    };
    const monthKey = (d) => (d ? String(d).slice(0, 7) : "");

    accountingRows.forEach((row) => {
      if (!row.date) return;
      if (row.kind === "expense" && row.recognition === "spread" && row.spreadMonths > 1) {
        const base = new Date(row.date);
        const monthly = row.amount / row.spreadMonths;
        for (let i = 0; i < row.spreadMonths; i++) {
          const d = new Date(base);
          d.setMonth(d.getMonth() + i);
          const key = d.toISOString().slice(0, 7);
          ensure(key);
          months[key].expenseSpread += monthly;
        }
        return;
      }
      const key = monthKey(row.date);
      ensure(key);
      if (row.kind === "realizedIncome") months[key].realizedIncome += row.amount;
      if (row.kind === "pendingIncome") months[key].pendingIncome += row.amount;
      if (row.kind === "expense") {
        months[key].expenseCash += row.amount;
        months[key].expenseSpread += row.amount;
      }
    });

    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, v]) => ({
        month,
        realizedIncome: v.realizedIncome,
        pendingIncome: v.pendingIncome,
        totalIncome: v.realizedIncome + v.pendingIncome,
        expense: v.expenseSpread,
        profitLoss: v.realizedIncome + v.pendingIncome - v.expenseSpread,
      }));
  }, [accountingRows]);

  const accountingSummary = useMemo(() => {
    const realizedIncome = monthlyProfitLoss.reduce((s, r) => s + r.realizedIncome, 0);
    const pendingIncome = monthlyProfitLoss.reduce((s, r) => s + r.pendingIncome, 0);
    const expense = monthlyProfitLoss.reduce((s, r) => s + r.expense, 0);
    return {
      realizedIncome,
      pendingIncome,
      totalIncome: realizedIncome + pendingIncome,
      expense,
      profitLoss: realizedIncome + pendingIncome - expense,
    };
  }, [monthlyProfitLoss]);

  const kpiSummary = useMemo(() => {
    const realizedIncome = monthlyProfitLoss.reduce((s, r) => s + r.realizedIncome, 0);
    const pendingIncome = monthlyProfitLoss.reduce((s, r) => s + r.pendingIncome, 0);
    const expense = monthlyProfitLoss.reduce((s, r) => s + r.expense, 0);
    return {
      companies: companies.length,
      contacts: contacts.length,
      openDeals: deals.filter((d) => ["işlemde", "ödeme bekleniyor"].includes(d.status)).length,
      reservedDeals: deals.filter((d) => ["reservasyonlu", "reserved", "reservasyon"].includes(d.status)).length,
      realizedIncome,
      pendingIncome,
      totalIncome: realizedIncome + pendingIncome,
      expense,
      profitLoss: realizedIncome + pendingIncome - expense,
    };
  }, [companies, contacts, deals, monthlyProfitLoss]);

  const expenseCategoryData = useMemo(() => {
    const map = {};
    expenses.forEach((e) => {
      const amount = Number(e.amount || 0);
      map[e.category] = (map[e.category] || 0) + amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const companyMap = useMemo(() => new Map(companies.map((c) => [String(c.companyName).toLowerCase(), c])), [companies]);
  const contactMap = useMemo(() => new Map(contacts.map((c) => [String(c.fullName).toLowerCase(), c])), [contacts]);

  const norm = (v) => String(v || "").trim().toLowerCase();
  const findDuplicateCompany = (name) => companies.find((c) => norm(c.companyName) === norm(name));
  const findDuplicateContact = (name, email) =>
    contacts.find(
      (c) => norm(c.fullName) === norm(name) || (email && norm(c.email1) && norm(c.email1) === norm(email))
    );

  const getCompanyById = (id) => companies.find((c) => c.id === id);
  const getContactById = (id) => contacts.find((c) => c.id === id);

  const askConfirm = (message) =>
    new Promise((resolve) => {
      setConfirmState({
        open: true,
        message,
        onConfirm: (result) => {
          resolve(result);
          setConfirmState({ open: false, message: "", onConfirm: null });
        },
      });
    });

  const resetCompanyForm = () =>
    setCompanyForm({ companyName: "", billingCity: "", phone: "", email: "", contactIds: [] });
  const resetContactForm = () =>
    setContactForm({ fullName: "", jobTitle: "", mobile: "", email1: "", companyIds: [] });
  const resetDealForm = () =>
    setDealForm({
      name: "",
      customerId: "",
      contactPersonId: "",
      dateReceived: "",
      status: "reservasyonlu",
      estRevenue: "",
      estCloseDate: "",
      note: "",
    });
  const resetProjectForm = () =>
    setProjectForm({
      name: "",
      companyId: "",
      contactPersonId: "",
      status: "işlemde",
      startDate: "",
      dueDate: "",
      estRevenue: "",
      owner: "",
      note: "",
    });

  const addContact = async () => {
    if (!contactForm.fullName) return;

    const duplicate = findDuplicateContact(contactForm.fullName, contactForm.email1);
    if (duplicate) {
      const ok = await askConfirm(`${duplicate.fullName} zaten sistemde mevcut. Yine de yeni kayıt oluşturmak istiyor musunuz?`);
      if (!ok) return;
    }

    const selectedCompanyNames = contactForm.companyIds
      .map((id) => getCompanyById(id)?.companyName)
      .filter(Boolean);

    const existingContact = contacts.find((c) => norm(c.fullName) === norm(contactForm.fullName));
    const existingRelatedCompanies = existingContact
      ? (existingContact.companyIds || []).map((id) => getCompanyById(id)?.companyName).filter(Boolean)
      : [];

    if (existingRelatedCompanies.length > 0 && selectedCompanyNames.length > 0) {
      const ok = await askConfirm(
        `${contactForm.fullName} daha önce ${existingRelatedCompanies.join(", ")} ile ilişkilendirilmiştir. ${selectedCompanyNames.join(", ")} şirket(ler)ine de eklemek istediğinize emin misiniz?`
      );
      if (!ok) return;
    }

    const primaryCompanyName = contactForm.companyIds.length ? getCompanyById(contactForm.companyIds[0])?.companyName || "" : "";

    const newContact = {
      id: crypto.randomUUID(),
      fullName: contactForm.fullName,
      company: primaryCompanyName,
      jobTitle: contactForm.jobTitle,
      mobile: contactForm.mobile,
      business: "",
      email1: contactForm.email1,
      cityBusiness: "",
      nextStep: "",
      lastActivity: "",
      owner: "Ayşe",
      companyIds: contactForm.companyIds,
      createdAt: new Date().toISOString(),
    };

    setContacts((prev) => [...prev, newContact]);
    setCompanies((prev) =>
      prev.map((company) =>
        contactForm.companyIds.includes(company.id)
          ? { ...company, contactIds: Array.from(new Set([...(company.contactIds || []), newContact.id])) }
          : company
      )
    );

    resetContactForm();
    setOpenForms((p) => ({ ...p, contact: false }));
  };

  const addCompany = async () => {
    if (!companyForm.companyName) return;

    const duplicate = findDuplicateCompany(companyForm.companyName);
    if (duplicate) {
      const ok = await askConfirm(`${duplicate.companyName} zaten sistemde mevcut. Yine de yeni kayıt oluşturmak istiyor musunuz?`);
      if (!ok) return;
    }

    const conflictedContacts = contacts.filter((contact) => {
      if (!companyForm.contactIds.includes(contact.id)) return false;
      return (contact.companyIds || []).length > 0;
    });

    if (conflictedContacts.length > 0) {
      const names = conflictedContacts.map((c) => c.fullName).join(", ");
      const ok = await askConfirm(
        `${companyForm.companyName} şirketine eklemek istediğiniz bazı kişiler daha önce başka şirket(ler)e bağlı: ${names}. Devam etmek ister misiniz?`
      );
      if (!ok) return;
    }

    const newCompany = {
      id: crypto.randomUUID(),
      companyName: companyForm.companyName,
      billingCity: companyForm.billingCity,
      phone: companyForm.phone,
      mobile: "",
      email: companyForm.email,
      nextStep: "",
      lastActivity: "",
      owner: "Ayşe",
      contactIds: companyForm.contactIds,
      createdAt: new Date().toISOString(),
    };

    setCompanies((prev) => [...prev, newCompany]);
    setContacts((prev) =>
      prev.map((contact) =>
        companyForm.contactIds.includes(contact.id)
          ? {
              ...contact,
              company: newCompany.companyName,
              companyIds: Array.from(new Set([...(contact.companyIds || []), newCompany.id])),
            }
          : contact
      )
    );

    resetCompanyForm();
    setOpenForms((p) => ({ ...p, company: false }));
  };

  const addDeal = () => {
    if (!dealForm.name || !dealForm.customerId || !dealForm.estRevenue) return;
    const customer = getCompanyById(dealForm.customerId);
    const contact = dealForm.contactPersonId ? getContactById(dealForm.contactPersonId) : null;
    const newDeal = {
      id: crypto.randomUUID(),
      name: dealForm.name,
      customer: customer?.companyName || "",
      contactPerson: contact?.fullName || "",
      dateReceived: dealForm.dateReceived,
      status: dealForm.status,
      estRevenue: Number(dealForm.estRevenue),
      estCloseDate: dealForm.estCloseDate,
      note: dealForm.note,
      projectId: dealForm.projectId || "",
      createdAt: new Date().toISOString(),
    };
    setDeals((prev) => [...prev, newDeal]);
    if (dealForm.projectId) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === dealForm.projectId
            ? { ...p, dealIds: Array.from(new Set([...(p.dealIds || []), newDeal.id])) }
            : p
        )
      );
    }
    resetDealForm();
    setOpenForms((p) => ({ ...p, deal: false }));
  };

  const addProject = () => {
    if (!projectForm.name?.trim()) {
      setImportMessage("Proje kaydı için proje adı zorunlu.");
      return;
    }
    if (!projectForm.companyId && !projectForm.contactPersonId) {
      setImportMessage("Proje kaydı için şirket veya kişi seçimi zorunlu.");
      return;
    }
    const company = projectForm.companyId ? getCompanyById(projectForm.companyId) : null;
    const contact = projectForm.contactPersonId ? getContactById(projectForm.contactPersonId) : null;
    if (projectForm.companyId && !company?.companyName) {
      setImportMessage("Seçilen şirket bulunamadı. Lütfen şirketi yeniden seçin.");
      return;
    }
    if (projectForm.contactPersonId && !contact?.fullName) {
      setImportMessage("Seçilen kişi bulunamadı. Lütfen kişiyi yeniden seçin.");
      return;
    }
    const newProject = {
      id: crypto.randomUUID(),
      name: projectForm.name.trim(),
      company: company?.companyName || contact?.company || "",
      contactPerson: contact?.fullName || "",
      status: projectForm.status,
      startDate: projectForm.startDate,
      dueDate: projectForm.dueDate,
      estRevenue: Number(projectForm.estRevenue || 0),
      owner: projectForm.owner,
      note: projectForm.note,
      description: projectForm.description,
      updates: [],
      dealIds: [],
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [...prev, newProject]);
    setImportMessage(`Proje kaydedildi: ${newProject.name}`);
    resetProjectForm();
    setOpenForms((p) => ({ ...p, project: false }));
  };

  const addProjectUpdate = () => {
    if (!activeRecord || activeDetailType !== "project") return;
    if (!projectUpdateForm.date || !projectUpdateForm.note.trim()) return;

    const update = {
      id: crypto.randomUUID(),
      date: projectUpdateForm.date,
      note: projectUpdateForm.note.trim(),
    };

    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeRecord.id
          ? { ...p, updates: [...(p.updates || []), update] }
          : p
      )
    );

    setProjectUpdateForm({ date: "", note: "" });
  };

  const addExpense = () => {
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.date) return;
    setExpenses((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: expenseForm.title,
        category: expenseForm.category === "__custom__"
          ? (expenseForm.customCategory.trim() || "other")
          : expenseForm.category,
        amount: Number(expenseForm.amount),
        date: expenseForm.date,
        type: expenseForm.type,
        cycle: expenseForm.type === "recurring" ? expenseForm.cycle : "",
        recognition: expenseForm.recognition,
        spreadMonths:
          expenseForm.type === "recurring" && expenseForm.recognition === "spread"
            ? Number(expenseForm.spreadMonths || 12)
            : 1,
        note: expenseForm.note,
        createdAt: new Date().toISOString(),
      },
    ]);
    setExpenseForm({
      title: "",
      category: "other",
      customCategory: "",
      amount: "",
      date: "",
      type: "one-time",
      cycle: "monthly",
      recognition: "cash",
      spreadMonths: 12,
      note: "",
    });
  };

  const deleteExpense = (id) => {
    if (window.confirm("Bu gideri silmek istediğinize emin misiniz?")) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const [editingExpense, setEditingExpense] = useState(null);

  const startEditExpense = (expense) => {
    setEditingExpense({ ...expense });
  };

  const saveEditExpense = () => {
    if (!editingExpense) return;
    if (!editingExpense.title || !editingExpense.amount || !editingExpense.date) return;
    setExpenses((prev) =>
      prev.map((e) =>
        e.id === editingExpense.id
          ? {
              ...e,
              title: editingExpense.title,
              category: editingExpense.category,
              amount: Number(editingExpense.amount),
              date: editingExpense.date,
              type: editingExpense.type,
              recognition: editingExpense.recognition,
              note: editingExpense.note,
            }
          : e
      )
    );
    setEditingExpense(null);
  };

  const addActivity = (e) => {
    e.preventDefault();
    if (!activeDetailId) return;
    const rec = {
      id: crypto.randomUUID(),
      entityType: activeDetailType,
      entityId: activeDetailId,
      type: activityForm.type,
      subject: activityForm.subject,
      body: activityForm.body,
      direction: activityForm.direction,
      status: activityForm.status,
      relatedCompanyId: activeDetailType === "company" ? activeDetailId : null,
      relatedContactId: activeDetailType === "contact" ? activeDetailId : null,
      relatedDealId: activeDetailType === "deal" ? activeDetailId : null,
      relatedProjectId: activeDetailType === "project" ? activeDetailId : null,
      createdAt: new Date().toISOString(),
      createdBy: activityForm.createdBy || "Ayşe",
      source: "manual",
    };
    setActivities((prev) => [rec, ...prev]);
    setActivityForm({ type: "note", subject: "", body: "", direction: "internal", status: "done", createdBy: "Ayşe" });
  };

  const updateDealStatus = (dealId, newStatus) => {
    setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d)));
  };

  const openDetail = (type, id) => {
    setActiveDetailType(type);
    setActiveDetailId(id);
    setPreviousView(view);
    setView("details");
  };

  const deleteRecord = (type, id) => {
    if (type === "company") {
      const companyName = companies.find((x) => x.id === id)?.companyName;
      setCompanies((prev) => prev.filter((x) => x.id !== id));
      setContacts((prev) => prev.filter((x) => x.company !== companyName));
      setDeals((prev) => prev.filter((x) => x.customer !== companyName));
      setProjects((prev) => prev.filter((x) => x.company !== companyName));
      setActivities((prev) => prev.filter((x) => x.relatedCompanyId !== id));
    }
    if (type === "contact") {
      setContacts((prev) => prev.filter((x) => x.id !== id));
      setActivities((prev) => prev.filter((x) => x.relatedContactId !== id));
    }
    if (type === "deal") {
      setDeals((prev) => prev.filter((x) => x.id !== id));
      setActivities((prev) => prev.filter((x) => x.relatedDealId !== id));
    }
    if (type === "project") {
      setProjects((prev) => prev.filter((x) => x.id !== id));
      setActivities((prev) => prev.filter((x) => x.relatedProjectId !== id));
    }
    setImportMessage("Kayıt silindi.");
    setView("details");
  };

  const startEdit = (type, item) => {
    setEditState({ type, item });
    setView("edit");
  };

  const saveEdit = (e) => {
    e.preventDefault();
    const { type, item } = editState;
    if (!type || !item) return;
    if (type === "company") setCompanies((prev) => prev.map((x) => (x.id === item.id ? item : x)));
    if (type === "contact") setContacts((prev) => prev.map((x) => (x.id === item.id ? item : x)));
    if (type === "deal") setDeals((prev) => prev.map((x) => (x.id === item.id ? item : x)));
    if (type === "project") setProjects((prev) => prev.map((x) => (x.id === item.id ? item : x)));
    setImportMessage("Kayıt güncellendi.");
    setView("details");
  };

  const handleRestoreComplete = () => {
    setContacts(JSON.parse(localStorage.getItem(LS_CONTACTS) || "[]"));
    setCompanies(JSON.parse(localStorage.getItem(LS_COMPANIES) || "[]"));
    setDeals(JSON.parse(localStorage.getItem(LS_DEALS) || "[]"));
    setProjects(JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]"));
    setActivities(JSON.parse(localStorage.getItem(LS_ACTIVITIES) || "[]"));
    setExpenses(JSON.parse(localStorage.getItem(LS_EXPENSES) || "[]"));
  };

  const importCSV = async (file, mode) => {
    const text = await file.text();
    const rows = parseCSV(text);

    if (mode === "companies") {
      const mapped = rows
        .map((r) => ({
          id: crypto.randomUUID(),
          companyName: firstNonEmpty(r.companyname, r.company, r["company-name"]),
          billingCity: firstNonEmpty(r.citybilling, r.billingcity, r.city, r["city-billing"]),
          phone: firstNonEmpty(r.phone),
          mobile: firstNonEmpty(r.mobile),
          email: firstNonEmpty(r.email),
          nextStep: firstNonEmpty(r.nextstep, r["next-step"]),
          lastActivity: firstNonEmpty(r.lastactivity, r["last-activity"]),
          owner: firstNonEmpty(r.owner),
          contactIds: [],
          createdAt: new Date().toISOString(),
        }))
        .filter((x) => x.companyName);
      setCompanies((prev) => [...prev, ...mapped]);
      setImportMessage(`${mapped.length} şirket içe aktarıldı.`);
    }

    if (mode === "contacts") {
      const mapped = rows
        .map((r) => ({
          id: crypto.randomUUID(),
          fullName: firstNonEmpty(r.fullname, r["full-name"]),
          company: firstNonEmpty(r.company),
          companyIds: [],
          jobTitle: firstNonEmpty(r.jobtitle, r["job-title"]),
          mobile: firstNonEmpty(r.mobile),
          business: firstNonEmpty(r.business),
          email1: firstNonEmpty(r.email1, r.email, r["email-1"]),
          cityBusiness: firstNonEmpty(r.citybusiness, r["city-business"]),
          nextStep: firstNonEmpty(r.nextstep, r["next-step"]),
          lastActivity: firstNonEmpty(r.lastactivity, r["last-activity"]),
          owner: firstNonEmpty(r.owner),
          description: firstNonEmpty(r.description, r["açıklama"], r.aciklama, r.detail, r.details),
          createdAt: new Date().toISOString(),
        }))
        .filter((x) => x.fullName);
      setContacts((prev) => [...prev, ...mapped]);
      setImportMessage(`${mapped.length} kişi içe aktarıldı.`);
    }

    if (mode === "deals") {
      const mapped = rows
        .map((r) => ({
          id: crypto.randomUUID(),
          customer: firstNonEmpty(r.customer),
          contactPerson: firstNonEmpty(r.contactperson, r["contact-person"]),
          name: firstNonEmpty(r.name),
          dateReceived: parseDate(firstNonEmpty(r.datereceived, r["date-received"])),
          status: firstNonEmpty(r.status).toLowerCase(),
          estRevenue: Number(firstNonEmpty(r.estrevenue, r["est-revenue"], 0) || 0),
          estCloseDate: parseDate(firstNonEmpty(r.estclosedate, r["est-close-date"], r["estclosedate"], r["est-close-date"])),
          createdAt: new Date().toISOString(),
        }))
        .filter((x) => x.customer && x.name);
      setDeals((prev) => [...prev, ...mapped]);
      setImportMessage(`${mapped.length} deal içe aktarıldı.`);
    }

    if (mode === "projects") {
      const mapped = rows
        .map((r) => ({
          id: crypto.randomUUID(),
          company: firstNonEmpty(r.company),
          contactPerson: firstNonEmpty(r.contactperson, r["contact-person"]),
          name: firstNonEmpty(r.name),
          status: firstNonEmpty(r.status).toLowerCase(),
          startDate: firstNonEmpty(r.startdate, r["start-date"]),
          dueDate: firstNonEmpty(r.duedate, r["due-date"]),
          estRevenue: Number(firstNonEmpty(r.estrevenue, r["est-revenue"], 0) || 0),
          owner: firstNonEmpty(r.owner),
          description: firstNonEmpty(r.description, r["açıklama"], r.aciklama, r.detail, r.details),
          createdAt: new Date().toISOString(),
        }))
        .filter((x) => x.company && x.name);
      setProjects((prev) => [...prev, ...mapped]);
      setImportMessage(`${mapped.length} proje içe aktarıldı.`);
    }
  };

  const entityLabel = (item, type) => {
    if (!item) return "";
    if (type === "company") return item.companyName;
    if (type === "contact") return item.fullName;
    if (type === "project") return item.name;
    return item.name;
  };

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.logoWrap}>
            <img src="asklepius-logo.png" alt="Asklepius Logo" style={styles.logo} />
          </div>
          <div style={styles.brand}>ASKLEPIUS</div>
          <div style={styles.subbrand}>TERCÜME HİZMETLERİ</div>

          <nav style={styles.sidebarMenu}>
            {[
              ["dashboard", "Dashboard"],
              ["companies", "Şirketler"],
              ["contacts", "Kişiler"],
              ["deals", "Deals"],
              ["projects", "Projects"],
              ["details", "Detay"],
              ["activities", "Aktiviteler"],
              ["reports", "Raporlar"],
              ["accounting", "Muhasebe"],
              ["gmail", "Mailleri Getir"],
              ["import", "İçe Aktar"],
              ["settings", "Ayarlar"],
            ].map(([k, t]) => (
              <button key={k} onClick={() => setView(k)} style={view === k ? styles.sidebarButtonActive : styles.sidebarButton}>
                {t}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {!googleAuth ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, color: "#D1D5DB", marginBottom: 4 }}>Google Hesabı Bağla</div>
              <button type="button" onClick={() => connectGoogleContacts()} style={{ ...styles.sidebarButton, background: "#fff", color: "#8A6322", fontWeight: 700 }}>
                Google Kişilerini Bağla
              </button>
              {googleLoading && <div style={{ fontSize: 12, color: "#D1D5DB" }}>Bağlanıyor...</div>}
              {googleError && <div style={{ fontSize: 12, color: "#FCA5A5" }}>{googleError}</div>}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#BBF7D0", fontWeight: 700 }}>Google Bağlı</div>
              <div style={{ fontSize: 11, color: "#E5E7EB" }}>{googleContacts.length} kişi eşleşti</div>
              <button
                type="button"
                onClick={handleGoogleDisconnect}
                style={{ ...styles.sidebarButton, fontSize: 12, padding: "6px 10px", color: "#FCA5A5", borderColor: "rgba(248,113,113,0.3)" }}
              >
                Bağlantıyı Kes
              </button>
            </div>
          )}
        </div>
      </aside>

      <main style={{ ...styles.main, flex: 1, minWidth: 0 }}>
        {importMessage && <div style={styles.notice}>{importMessage}</div>}

        {view === "dashboard" && (
          <section style={styles.grid2}>
            <div style={{ ...styles.kpiGrid, gridColumn: "1 / -1" }}>
              <div style={styles.kpiCard}><div style={styles.kpiLabel}>Rezervasyonlu Deal</div><div style={styles.kpiValue}>{kpiSummary.reservedDeals}</div></div>
            </div>

            <Panel title="Rezervasyonlu İşler">
              {reservedDeals.length === 0 ? (
                <p style={{ color: "#6B7280", fontSize: 14 }}>Rezervasyonlu iş yok.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {reservedDeals.map((d) => (
                    <li key={d.id} style={{ padding: "10px 12px", borderRadius: 10, background: "#fff8ea", border: "1px solid #f1e4c8" }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                      <div style={{ fontSize: 13, color: "#6B7280" }}>{d.customer} · {d.dateReceived || "-"} · {money(d.estRevenue)}</div>
                      <button onClick={() => openDetail("deal", d.id)} style={{ ...styles.smallBtn, marginTop: 6 }}>Detay</button>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Closed Won">
              {deals.filter((d) => d.status === "closed won").length === 0 ? (
                <p style={{ color: "#6B7280", fontSize: 14 }}>Henüz closed won deal yok.</p>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {deals
                    .filter((d) => d.status === "closed won")
                    .slice()
                    .sort((a, b) => {
                      // En son kapanan üstte
                      const dateA = String(a.estCloseDate || a.dateReceived || a.createdAt || "");
                      const dateB = String(b.estCloseDate || b.dateReceived || b.createdAt || "");
                      return dateB.localeCompare(dateA);
                    })
                    .map((d) => (
                      <li key={d.id} style={{ padding: "10px 12px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{d.name}</div>
                        <div style={{ fontSize: 13, color: "#6B7280" }}>{d.customer} · {d.dateReceived || "-"} · {money(d.estRevenue)}</div>
                        <button onClick={() => openDetail("deal", d.id)} style={{ ...styles.smallBtn, marginTop: 6 }}>Detay</button>
                      </li>
                    ))}
                </ul>
              )}
            </Panel>
          </section>
        )}

        {view === "companies" && (
          <section style={styles.grid2}>
            <Panel title="Şirketler Listesi">
              <input
                type="text"
                placeholder="Şirket adı, şehir veya e-posta ile ara…"
                value={companySearch}
                onChange={(e) => setCompanySearch(e.target.value)}
                style={{ ...styles.input, marginBottom: 12, width: "100%", boxSizing: "border-box" }}
              />
              {companies
                .filter((c) => {
                  if (!companySearch) return true;
                  const q = companySearch.toLowerCase();
                  return (
                    (c.companyName || "").toLowerCase().includes(q) ||
                    (c.billingCity || "").toLowerCase().includes(q) ||
                    (c.email || "").toLowerCase().includes(q) ||
                    (c.phone || "").toLowerCase().includes(q)
                  );
                })
                .map((c) => (
                <Card key={c.id}>
                  <b>{c.companyName}</b>
                  <div>{c.billingCity} · {c.phone} · {c.email || "-"}</div>
                  <div style={styles.cardActions}>
                    <button onClick={() => openDetail("company", c.id)} style={styles.smallBtn}>Detay</button>
                    <button onClick={() => startEdit("company", c)} style={styles.smallBtn}>Düzenle</button>
                    <button onClick={() => deleteRecord("company", c.id)} style={styles.smallDanger}>Sil</button>
                  </div>
                </Card>
              ))}
            </Panel>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Panel title="Şirketler">
                <button style={styles.smallBtn} type="button" onClick={() => setOpenForms((p) => ({ ...p, company: !p.company }))}>+ Yeni Şirket</button>
                {openForms.company && (
                  <div style={{ marginTop: 12 }}>
                    <div style={styles.filters}>
                      <input style={styles.input} placeholder="Şirket adı" value={companyForm.companyName} onChange={(e) => setCompanyForm((p) => ({ ...p, companyName: e.target.value }))} />
                      <input style={styles.input} placeholder="Billing city" value={companyForm.billingCity} onChange={(e) => setCompanyForm((p) => ({ ...p, billingCity: e.target.value }))} />
                    </div>
                    <div style={styles.filters}>
                      <input style={styles.input} placeholder="Telefon" value={companyForm.phone} onChange={(e) => setCompanyForm((p) => ({ ...p, phone: e.target.value }))} />
                      <input style={styles.input} placeholder="Email" value={companyForm.email} onChange={(e) => setCompanyForm((p) => ({ ...p, email: e.target.value }))} />
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ marginBottom: 6 }}>Bağlı kişiler</div>
                      <select multiple value={companyForm.contactIds} onChange={(e) => setCompanyForm((p) => ({ ...p, contactIds: Array.from(e.target.selectedOptions, (o) => o.value) }))} style={{ ...styles.input, height: 120 }}>
                        {contacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}</option>)}
                      </select>
                    </div>
                    <div style={styles.filters}>
                      <button style={styles.smallBtn} onClick={addCompany} type="button">Kaydet</button>
                      <button style={styles.smallBtn} onClick={() => { resetCompanyForm(); setOpenForms((p) => ({ ...p, company: false })); }} type="button">İptal</button>
                    </div>
                  </div>
                )}
              </Panel>

              <Panel title="Şirket Özeti">
                <p>Toplam şirket: {companies.length}</p>
                <p>Bağlı kişi: {contacts.filter((x) => x.company).length}</p>
                <p>Bağlı deal: {deals.filter((x) => x.customer).length}</p>
              </Panel>
            </div>
          </section>
        )}

        {view === "contacts" && (
          <section style={styles.grid2}>
            <Panel title="Kişiler Listesi">
              <input
                type="text"
                placeholder="İsim, şirket veya e-posta ile ara…"
                value={contactSearch}
                onChange={(e) => setContactSearch(e.target.value)}
                style={{ ...styles.input, marginBottom: 12, width: "100%", boxSizing: "border-box" }}
              />
              {enrichedContacts
                .filter((c) => {
                  if (!contactSearch) return true;
                  const q = contactSearch.toLowerCase();
                  return (
                    (c.fullName || "").toLowerCase().includes(q) ||
                    (c.company || "").toLowerCase().includes(q) ||
                    (c.email1 || "").toLowerCase().includes(q) ||
                    (c.mobile || "").toLowerCase().includes(q)
                  );
                })
                .map((c) => {
                const companyMatch = companyMap.get(String(c.company || "").toLowerCase());
                return (
                  <Card key={c.id}>
                    <b>{c.fullName}</b>
                    <div>{c.company} {companyMatch ? "-" : ""} {c.jobTitle} - {c.email1}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: c.googleMatched ? "#15803d" : "#9CA3AF", fontWeight: 600 }}>
                      {c.googleMatched ? `Google eşleşti${c.googleName ? `: ${c.googleName}` : ""}` : "Google eşleşmedi"}
                    </div>
                    {c.googleMatched && c.googleEmail && <div style={{ fontSize: 12, color: "#6B7280", marginTop: 4 }}>Google Email: {c.googleEmail}</div>}
                    <div style={styles.cardActions}>
                      <button onClick={() => openDetail("contact", c.id)} style={styles.smallBtn}>Detay</button>
                      <button onClick={() => startEdit("contact", c)} style={styles.smallBtn}>Düzenle</button>
                      <button onClick={() => deleteRecord("contact", c.id)} style={styles.smallDanger}>Sil</button>
                    </div>
                  </Card>
                );
              })}
            </Panel>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Panel title="Kişiler">
                <button style={styles.smallBtn} type="button" onClick={() => setOpenForms((p) => ({ ...p, contact: !p.contact }))}>+ Yeni Kişi</button>
                {openForms.contact && (
                  <div style={{ marginTop: 12 }}>
                    <div style={styles.filters}>
                      <input style={styles.input} placeholder="Ad soyad" value={contactForm.fullName} onChange={(e) => setContactForm((p) => ({ ...p, fullName: e.target.value }))} />
                      <input style={styles.input} placeholder="Ünvan" value={contactForm.jobTitle} onChange={(e) => setContactForm((p) => ({ ...p, jobTitle: e.target.value }))} />
                    </div>
                    <div style={styles.filters}>
                      <input style={styles.input} placeholder="Cep telefonu" value={contactForm.mobile} onChange={(e) => setContactForm((p) => ({ ...p, mobile: e.target.value }))} />
                      <input style={styles.input} placeholder="Email" value={contactForm.email1} onChange={(e) => setContactForm((p) => ({ ...p, email1: e.target.value }))} />
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <div style={{ marginBottom: 6 }}>Bağlı şirketler</div>
                      <select multiple value={contactForm.companyIds} onChange={(e) => setContactForm((p) => ({ ...p, companyIds: Array.from(e.target.selectedOptions, (o) => o.value) }))} style={{ ...styles.input, height: 120 }}>
                        {companies.map((company) => <option key={company.id} value={company.id}>{company.companyName}</option>)}
                      </select>
                    </div>
                    <div style={styles.filters}>
                      <button style={styles.smallBtn} onClick={addContact} type="button">Kaydet</button>
                      <button style={styles.smallBtn} onClick={() => { resetContactForm(); setOpenForms((p) => ({ ...p, contact: false })); }} type="button">İptal</button>
                    </div>
                  </div>
                )}
              </Panel>

              <Panel title="Şirket Eşleştirme">
                <p>Şirket adı CSV’de şirketler ile eşleşirse kişi otomatik bağlı görünür.</p>
                <p>Boşsa kişi bağımsız kalır.</p>
                <p style={{ marginTop: 12 }}>Google Contacts bağlantısı aktifse eşleşmeler kişi kartlarında ayrıca gösterilir.</p>
              </Panel>
            </div>
          </section>
        )}

        {view === "deals" && (
          <section style={styles.grid2}>
            <Panel title="Deal Filtreleri">
              <div style={styles.filters}>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={styles.input}>
                  <option value="">Tüm statüler</option>
                  {dealStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} style={styles.input}>
                  <option value="">Tüm şirketler</option>
                  {companies.map((c) => <option key={c.id} value={c.companyName}>{c.companyName}</option>)}
                </select>
                <select value={contactFilter} onChange={(e) => setContactFilter(e.target.value)} style={styles.input}>
                  <option value="">Tüm kişiler</option>
                  {contacts.map((c) => <option key={c.id} value={c.fullName}>{c.fullName}</option>)}
                </select>
              </div>
              <div style={styles.filters}>
                <select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} style={styles.input}>
                  <option value="">Tüm yıllar</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
                <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={styles.input} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ara..." style={styles.input} />
              </div>
            </Panel>

            <Panel title="Dealler">
              <button style={styles.smallBtn} type="button" onClick={() => setOpenForms((p) => ({ ...p, deal: !p.deal }))}>+ Yeni Deal</button>
              {openForms.deal && (
                <div style={{ marginTop: 12 }}>
                  <div style={styles.filters}>
                    <input style={styles.input} placeholder="Deal adı" value={dealForm.name} onChange={(e) => setDealForm((p) => ({ ...p, name: e.target.value }))} />
                    <select style={styles.input} value={dealForm.customerId} onChange={(e) => {
                      const companyId = e.target.value;
                      const selectedCompany = getCompanyById(companyId);
                      const firstContactId = selectedCompany?.contactIds?.[0] || "";
                      setDealForm((p) => ({ ...p, customerId: companyId, contactPersonId: firstContactId }));
                    }}>
                      <option value="">Şirket seç</option>
                      {companies.map((company) => <option key={company.id} value={company.id}>{company.companyName}</option>)}
                    </select>
                  </div>
                  <div style={styles.filters}>
                    <select style={styles.input} value={dealForm.contactPersonId} onChange={(e) => setDealForm((p) => ({ ...p, contactPersonId: e.target.value }))}>
                      <option value="">Kişi seç</option>
                      {contacts.filter((contact) => !dealForm.customerId ? true : (contact.companyIds || []).includes(dealForm.customerId)).map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}</option>)}
                    </select>
                    <input style={styles.input} type="date" value={dealForm.dateReceived} onChange={(e) => setDealForm((p) => ({ ...p, dateReceived: e.target.value }))} />
                  </div>
                  <div style={styles.filters}>
                    <select style={styles.input} value={dealForm.status} onChange={(e) => setDealForm((p) => ({ ...p, status: e.target.value }))}>
                      {dealStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input style={styles.input} type="number" placeholder="Tahmini gelir" value={dealForm.estRevenue} onChange={(e) => setDealForm((p) => ({ ...p, estRevenue: e.target.value }))} />
                  </div>
                  <div style={styles.filters}>
                    <input style={styles.input} type="date" value={dealForm.estCloseDate} onChange={(e) => setDealForm((p) => ({ ...p, estCloseDate: e.target.value }))} />
                    <input style={styles.input} placeholder="Not" value={dealForm.note} onChange={(e) => setDealForm((p) => ({ ...p, note: e.target.value }))} />
                  </div>
                  <div style={styles.filters}>
                    <select style={styles.input} value={dealForm.projectId} onChange={(e) => setDealForm((p) => ({ ...p, projectId: e.target.value }))}>
                      <option value="">Proje seç (opsiyonel)</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div style={styles.filters}>
                    <button style={styles.smallBtn} onClick={addDeal} type="button">Kaydet</button>
                    <button style={styles.smallBtn} onClick={() => { resetDealForm(); setOpenForms((p) => ({ ...p, deal: false })); }} type="button">İptal</button>
                  </div>
                </div>
              )}

              {dealFiltered.map((d) => (
                <Card key={d.id}>
                  <b>{d.name}</b>
                  <div>{d.customer} · {d.contactPerson} - {d.status}</div>
                  <div>{d.dateReceived} · {money(d.estRevenue)} · {d.estCloseDate || "-"}</div>
                  <div style={styles.cardActions}>
                    <button onClick={() => openDetail("deal", d.id)} style={styles.smallBtn}>Detay</button>
                    <button onClick={() => startEdit("deal", d)} style={styles.smallBtn}>Düzenle</button>
                    <button onClick={() => deleteRecord("deal", d.id)} style={styles.smallDanger}>Sil</button>
                  </div>
                </Card>
              ))}
            </Panel>
          </section>
        )}

        {view === "projects" && (
          <section style={styles.grid2}>
            <Panel title="Projects Listesi">
              {projects.map((p) => (
                <Card key={p.id}>
                  <b>{p.name}</b>
                  <div>{p.company} · {p.contactPerson} - {p.status}</div>
                  <div>{p.startDate} - {p.dueDate} - {money(p.estRevenue)}</div>
                  <div style={styles.cardActions}>
                    <button onClick={() => openDetail("project", p.id)} style={styles.smallBtn}>Detay</button>
                    <button onClick={() => startEdit("project", p)} style={styles.smallBtn}>Düzenle</button>
                    <button onClick={() => deleteRecord("project", p.id)} style={styles.smallDanger}>Sil</button>
                  </div>
                </Card>
              ))}
            </Panel>

            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Panel title="Projeler">
                <button style={styles.smallBtn} type="button" onClick={() => setOpenForms((p) => ({ ...p, project: !p.project }))}>+ Yeni Proje</button>
                {openForms.project && (
                  <div style={{ marginTop: 12 }}>
                    <div style={styles.filters}>
                      <input style={styles.input} placeholder="Proje adı" value={projectForm.name} onChange={(e) => setProjectForm((p) => ({ ...p, name: e.target.value }))} />
                      <select style={styles.input} value={projectForm.companyId} onChange={(e) => {
                        const companyId = e.target.value;
                        const selectedCompany = getCompanyById(companyId);
                        const firstContactId = selectedCompany?.contactIds?.[0] || "";
                        setProjectForm((p) => ({ ...p, companyId, contactPersonId: firstContactId }));
                      }}>
                        <option value="">Şirket seç</option>
                        {companies.map((company) => <option key={company.id} value={company.id}>{company.companyName}</option>)}
                      </select>
                    </div>
                    <div style={styles.filters}>
                      <select style={styles.input} value={projectForm.contactPersonId} onChange={(e) => setProjectForm((p) => ({ ...p, contactPersonId: e.target.value }))}>
                        <option value="">Kişi seç</option>
                        {contacts.filter((contact) => !projectForm.companyId ? true : (contact.companyIds || []).includes(projectForm.companyId)).map((contact) => <option key={contact.id} value={contact.id}>{contact.fullName}</option>)}
                      </select>
                      <select style={styles.input} value={projectForm.status} onChange={(e) => setProjectForm((p) => ({ ...p, status: e.target.value }))}>
                        <option value="işlemde">İşlemde</option>
                        <option value="beklemede">Beklemede</option>
                        <option value="tamamlandı">Tamamlandı</option>
                        <option value="iptal">İptal</option>
                      </select>
                    </div>
                    <div style={styles.filters}>
                      <input style={styles.input} type="date" value={projectForm.startDate} onChange={(e) => setProjectForm((p) => ({ ...p, startDate: e.target.value }))} />
                      <input style={styles.input} type="date" value={projectForm.dueDate} onChange={(e) => setProjectForm((p) => ({ ...p, dueDate: e.target.value }))} />
                    </div>
                    <div style={styles.filters}>
                      <input style={styles.input} type="number" placeholder="Tahmini gelir" value={projectForm.estRevenue} onChange={(e) => setProjectForm((p) => ({ ...p, estRevenue: e.target.value }))} />
                      <input style={styles.input} placeholder="Sorumlu" value={projectForm.owner} onChange={(e) => setProjectForm((p) => ({ ...p, owner: e.target.value }))} />
                    </div>
                    <div style={styles.filters}>
                      <input style={styles.input} placeholder="Not" value={projectForm.note} onChange={(e) => setProjectForm((p) => ({ ...p, note: e.target.value }))} />
                    </div>
                    <div style={styles.filters}>
                      <button style={styles.smallBtn} onClick={addProject} type="button">Kaydet</button>
                      <button style={styles.smallBtn} onClick={() => { resetProjectForm(); setOpenForms((p) => ({ ...p, project: false })); }} type="button">İptal</button>
                    </div>
                  </div>
                )}
              </Panel>

              <Panel title="Project Özeti">
                <p>Toplam proje: {projects.length}</p>
                <p>Aktif proje: {projects.filter((p) => p.status === "işlemde").length}</p>
              </Panel>
            </div>
          </section>
        )}

        {view === "details" && (
          <section style={styles.grid2}>
            <Panel title="Kayıt Detay">
              <button
                onClick={() => setView(previousView)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8A6322", fontWeight: 600, fontSize: 13, marginBottom: 12, padding: 0, display: "flex", alignItems: "center", gap: 4 }}
              >
                ← Geri Dön
              </button>
              {activeRecord ? (
                <>
                  <p><b>{entityLabel(activeRecord, activeDetailType)}</b></p>
                  <p>Tip: {activeDetailType}</p>
                  <p>
                    {activeDetailType === "company" && `${activeRecord.billingCity || "-"} · ${activeRecord.phone || "-"} · ${activeRecord.email || "-"}`}
                    {activeDetailType === "contact" && `${activeRecord.company || "-"} · ${activeRecord.jobTitle || "-"} · ${activeRecord.email1 || "-"}`}
                    {activeDetailType === "deal" && `${activeRecord.customer || "-"} · ${activeRecord.contactPerson || "-"} · ${activeRecord.status}`}
                    {activeDetailType === "project" && `${activeRecord.company || "-"} · ${activeRecord.contactPerson || "-"} · ${activeRecord.status}`}
                  </p>
                  <div style={styles.cardActions}>
                    <button onClick={() => startEdit(activeDetailType, activeRecord)} style={styles.smallBtn}>Düzenle</button>
                    <button onClick={() => deleteRecord(activeDetailType, activeDetailId)} style={styles.smallDanger}>Sil</button>
                  </div>
                </>
              ) : (
                <p>Kayıt seçilmedi.</p>
              )}
            </Panel>

            <Panel title="Aktivite Timeline">
              <div style={styles.filters}>
                <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} style={styles.input}>
                  <option value="all">Tümü</option>
                  {activityTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <input type="date" value={activityFrom} onChange={(e) => setActivityFrom(e.target.value)} style={styles.input} />
                <input type="date" value={activityTo} onChange={(e) => setActivityTo(e.target.value)} style={styles.input} />
              </div>

              {relatedActivities.map((a) => (
                <div key={a.id} style={{ ...styles.card }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <b>{a.subject}</b>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        {a.type} · {a.direction}
                        {a.source === "gmail-manual" && <span style={{ marginLeft: 6, background: "#dbeafe", color: "#1e40af", borderRadius: 99, padding: "1px 7px", fontSize: 11, fontWeight: 600 }}>Gmail</span>}
                        {" · "}{new Date(a.createdAt).toLocaleString("tr-TR")}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13, whiteSpace: "pre-wrap" }}>{a.body}</div>
                    </div>
                    <button
                      onClick={() => deleteActivity(a.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, padding: "2px 4px", flexShrink: 0 }}
                      title="Sil"
                    >🗑</button>
                  </div>
                </div>
              ))}

              <form onSubmit={addActivity} style={{ display: "grid", gap: 10, marginTop: 18 }}>
                <select value={activityForm.type} onChange={(e) => setActivityForm({ ...activityForm, type: e.target.value })} style={styles.input}>
                  {activityTypes.map((x) => <option key={x} value={x}>{x}</option>)}
                </select>
                <select value={activityForm.direction} onChange={(e) => setActivityForm({ ...activityForm, direction: e.target.value })} style={styles.input}>
                  <option value="internal">internal</option>
                  <option value="incoming">incoming</option>
                  <option value="outgoing">outgoing</option>
                </select>
                <input placeholder="Başlık" value={activityForm.subject} onChange={(e) => setActivityForm({ ...activityForm, subject: e.target.value })} style={styles.input} />
                <textarea placeholder="Açıklama" value={activityForm.body} onChange={(e) => setActivityForm({ ...activityForm, body: e.target.value })} style={styles.textarea} />
                <button style={styles.primaryBtn}>Aktivite Ekle</button>
              </form>

              {activeRecord && activeDetailType === "project" && (
                <div style={{ marginTop: 24 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Proje Gelişmeleri</h3>
                  <div style={{ display: "grid", gap: 8, marginBottom: 10 }}>
                    <label style={styles.field}>
                      <span style={styles.label}>Tarih</span>
                      <input
                        type="date"
                        value={projectUpdateForm.date}
                        onChange={(e) => setProjectUpdateForm((f) => ({ ...f, date: e.target.value }))}
                        style={styles.input}
                      />
                    </label>
                    <label style={styles.field}>
                      <span style={styles.label}>Not</span>
                      <textarea
                        value={projectUpdateForm.note}
                        onChange={(e) => setProjectUpdateForm((f) => ({ ...f, note: e.target.value }))}
                        style={styles.textarea}
                        placeholder="Bugünkü gelişmeyi yaz..."
                      />
                    </label>
                    <button type="button" onClick={addProjectUpdate} style={styles.primaryBtn}>Gelişme Ekle</button>
                  </div>

                  {(activeRecord.updates || []).length === 0 ? (
                    <p style={styles.mutedDark}>Henüz gelişme eklenmemiş.</p>
                  ) : (
                    <div style={{ maxHeight: 220, overflowY: "auto" }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            <th style={styles.th}>Tarih</th>
                            <th style={styles.th}>Not</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(activeRecord.updates || [])
                            .slice()
                            .sort((a, b) => b.date.localeCompare(a.date))
                            .map((u) => (
                              <tr key={u.id}>
                                <td style={styles.td}>{u.date || "-"}</td>
                                <td style={styles.td}>{u.note}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div style={{ marginTop: 16 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Bağlı Deal'ler</h3>
                    {deals.filter((d) => d.projectId === activeRecord.id).length === 0 ? (
                      <p style={styles.mutedDark}>Bu projeye bağlı deal yok.</p>
                    ) : (
                      <div style={{ maxHeight: 220, overflowY: "auto" }}>
                        <table style={styles.table}>
                          <thead>
                            <tr>
                              <th style={styles.th}>Deal</th>
                              <th style={styles.th}>Şirket</th>
                              <th style={styles.th}>Gelir</th>
                              <th style={styles.th}>Statü</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deals
                              .filter((d) => d.projectId === activeRecord.id)
                              .map((d) => (
                                <tr key={d.id}>
                                  <td style={styles.td}>{d.name}</td>
                                  <td style={styles.td}>{d.customer}</td>
                                  <td style={{ ...styles.td, fontWeight: 600 }}>{money(d.estRevenue)}</td>
                                  <td style={styles.td}>{d.status}</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </Panel>
          </section>
        )}

        {view === "activities" && (
          <section style={styles.grid2}>
            <Panel title="Aktivite Listesi">
              {activities.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((a) => (
                <div key={a.id} style={{ ...styles.card, position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <b>{a.subject}</b>
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
                        {a.entityType} · {a.type}
                        {a.source === "gmail-manual" && <span style={{ marginLeft: 6, background: "#dbeafe", color: "#1e40af", borderRadius: 99, padding: "1px 7px", fontSize: 11, fontWeight: 600 }}>Gmail</span>}
                        {" · "}{new Date(a.createdAt).toLocaleString("tr-TR")}
                      </div>
                      <div style={{ marginTop: 4, fontSize: 13 }}>{a.body}</div>
                    </div>
                    <button
                      onClick={() => deleteActivity(a.id)}
                      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, padding: "2px 4px", flexShrink: 0 }}
                      title="Sil"
                    >🗑</button>
                  </div>
                </div>
              ))}
            </Panel>
            <Panel title="Aktivite Özeti">
              <p>Toplam aktivite: {activities.length}</p>
              <p>Email: {activities.filter((a) => a.type === "email").length}</p>
              <p>Not: {activities.filter((a) => a.type === "note").length}</p>
            </Panel>
          </section>
        )}

        {view === "reports" && (
          <section style={styles.grid2}>
            <Panel title={`${reportYearFilter || 'Tüm'} Gelir Raporu`}>
              <div style={styles.filters}>
                <select value={reportStatusFilter} onChange={(e) => setReportStatusFilter(e.target.value)} style={styles.input}>
                  <option value="">Tüm statüler</option>
                  {dealStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <select value={reportCompanyFilter} onChange={(e) => setReportCompanyFilter(e.target.value)} style={styles.input}>
                  <option value="">Tüm şirketler</option>
                  {companies.map((c) => <option key={c.id} value={c.companyName}>{c.companyName}</option>)}
                </select>
                <select value={reportContactFilter} onChange={(e) => setReportContactFilter(e.target.value)} style={styles.input}>
                  <option value="">Tüm kişiler</option>
                  {contacts.map((c) => <option key={c.id} value={c.fullName}>{c.fullName}</option>)}
                </select>
              </div>
              <div style={styles.filters}>
                <select value={reportYearFilter} onChange={(e) => setReportYearFilter(e.target.value)} style={styles.input}>
                  <option value="">Tüm yıllar</option>
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                </select>
                <input type="month" value={reportMonthFilter} onChange={(e) => setReportMonthFilter(e.target.value)} style={styles.input} />
                <input type="date" value={reportFromDate} onChange={(e) => setReportFromDate(e.target.value)} style={styles.input} />
              </div>
              <div style={styles.filters}>
                <input type="date" value={reportToDate} onChange={(e) => setReportToDate(e.target.value)} style={styles.input} />
                <button
                  type="button"
                  onClick={() => {
                    setReportStatusFilter("");
                    setReportCompanyFilter("");
                    setReportContactFilter("");
                    setReportYearFilter("");
                    setReportMonthFilter("");
                    setReportFromDate("");
                    setReportToDate("");
                  }}
                  style={{ ...styles.input, background: "#f3f4f6", color: "#374151", cursor: "pointer", border: "1px solid #d1d5db", fontWeight: 600 }}
                >
                  ↺ Sıfırla
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const el = document.getElementById("report-printable");
                    if (!el) return;
                    const win = window.open("", "_blank");
                    win.document.write(`
                      <html><head><title>Asklepius CRM — Gelir Raporu</title>
                      <style>
                        body { font-family: Inter, system-ui, sans-serif; padding: 24px; color: #1f2937; }
                        h2 { color: #8A6322; margin-bottom: 8px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                        th { background: #8A6322; color: #fff; padding: 8px 12px; text-align: left; font-size: 13px; }
                        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
                        tr:nth-child(even) td { background: #fef9f0; }
                        .kpi-row { display: flex; gap: 16px; margin: 16px 0; flex-wrap: wrap; }
                        .kpi { background: #fff8ea; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 18px; }
                        .kpi-label { font-size: 11px; color: #6b7280; }
                        .kpi-value { font-size: 20px; font-weight: 700; color: #1f2937; }
                      </style></head><body>
                      ${el.innerHTML}
                      </body></html>
                    `);
                    win.document.close();
                    win.focus();
                    setTimeout(() => { win.print(); win.close(); }, 400);
                  }}
                  style={{ ...styles.input, background: "#8A6322", color: "#fff", cursor: "pointer", border: "none", fontWeight: 600 }}
                >
                  📄 PDF İndir
                </button>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reportMonthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="value" fill="#E0A23F" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Status Dağılımı">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={reportDealStatusPie} dataKey="value" nameKey="name" outerRadius={90} label>
                    {reportDealStatusPie.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Panel>

            <div style={{ gridColumn: "1 / -1" }}>
              <Panel title="Filtrelenmiş Deal Listesi">
                <div id="report-printable">
                  <h2 style={{ color: "#8A6322", marginBottom: 8 }}>
                    Asklepius CRM — Gelir Raporu
                    {reportYearFilter ? ` (${reportYearFilter})` : ""}
                    {reportMonthFilter ? ` / ${reportMonthFilter}` : ""}
                    {reportCompanyFilter ? ` — ${reportCompanyFilter}` : ""}
                  </h2>
                  <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                    <div style={{ background: "#fff8ea", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 18px" }}>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Deal Sayısı</div>
                      <div style={{ fontSize: 20, fontWeight: 700 }}>{reportDeals.length}</div>
                    </div>
                    <div style={{ background: "#fff8ea", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 18px" }}>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Toplam Gelir</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: "#166534" }}>{money(reportDeals.filter((d) => ["closed won","reservasyon","reservasyonlu","reserved"].includes(d.status)).reduce((s, d) => s + Number(d.estRevenue || 0), 0))}</div>
                    </div>
                    <div style={{ background: "#fff8ea", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 18px" }}>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Rapor Tarihi</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{new Date().toLocaleDateString("tr-TR")}</div>
                    </div>
                  </div>
                  {reportDeals.length === 0 ? (
                    <p>Sonuç bulunamadı.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            {['Deal','Şirket','Kişi','Tarih','Statü','Gelir'].map((h)=><th key={h} style={styles.th}>{h}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {reportDeals.map((d) => (
                          <tr key={d.id}>
                            <td style={styles.td}>{d.name}</td>
                            <td style={styles.td}>{d.customer}</td>
                            <td style={styles.td}>{d.contactPerson || "-"}</td>
                            <td style={styles.td}>{d.dateReceived || "-"}</td>
                            <td style={styles.td}>
                              <span style={{
                                padding: "2px 8px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                                background: d.status === "closed won" ? "#dcfce7"
                                  : d.status === "kayıp/iptal" ? "#fee2e2"
                                  : ["reservasyon","reservasyonlu","reserved"].includes(d.status) ? "#fef9c3"
                                  : "#f3f4f6",
                                color: d.status === "closed won" ? "#166534"
                                  : d.status === "kayıp/iptal" ? "#991b1b"
                                  : ["reservasyon","reservasyonlu","reserved"].includes(d.status) ? "#92400e"
                                  : "#374151",
                              }}>{d.status}</span>
                            </td>
                            <td style={{ ...styles.td, fontWeight: 600, color: "#166534" }}>{money(d.estRevenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  )}
                </div>
              </Panel>
            </div>
          </section>
        )}

        {view === "accounting" && (
          <section style={styles.grid2}>

            {/* ── Filtreler ── */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Panel title="Gelir / Gider Raporu Filtreleri">
                <div style={styles.filters}>
                  <select value={accYearFilter} onChange={(e) => setAccYearFilter(e.target.value)} style={styles.input}>
                    <option value="">Tüm yıllar</option>
                    <option value="2024">2024</option>
                    <option value="2025">2025</option>
                    <option value="2026">2026</option>
                  </select>
                  <input type="month" value={accMonthFilter} onChange={(e) => setAccMonthFilter(e.target.value)} style={styles.input} placeholder="Ay seç" />
                  <input type="date" value={expenseDateFrom} onChange={(e) => setExpenseDateFrom(e.target.value)} style={styles.input} />
                  <input type="date" value={expenseDateTo} onChange={(e) => setExpenseDateTo(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.filters}>
                  <select value={accCompanyFilter} onChange={(e) => setAccCompanyFilter(e.target.value)} style={styles.input}>
                    <option value="">Tüm şirketler</option>
                    {companies.map((c) => <option key={c.id} value={c.companyName}>{c.companyName}</option>)}
                  </select>
                  <select value={accContactFilter} onChange={(e) => setAccContactFilter(e.target.value)} style={styles.input}>
                    <option value="">Tüm kişiler</option>
                    {contacts.map((c) => <option key={c.id} value={c.fullName}>{c.fullName}</option>)}
                  </select>
                  <select value={expenseCategoryFilter} onChange={(e) => setExpenseCategoryFilter(e.target.value)} style={styles.input}>
                    <option value="">Tüm kategoriler</option>
                    <option value="software">Software</option>
                    <option value="salary">Salary</option>
                    <option value="rent">Rent</option>
                    <option value="tax">Tax</option>
                    <option value="other">Other</option>
                  </select>
                  <select value={expenseTypeFilter} onChange={(e) => setExpenseTypeFilter(e.target.value)} style={styles.input}>
                    <option value="">Tüm türler</option>
                    <option value="realizedIncome">Gerçekleşen gelir</option>
                    <option value="pendingIncome">Rezervasyon geliri</option>
                    <option value="expense">Gider</option>
                  </select>
                </div>
                <div style={styles.filters}>
                  <button
                    type="button"
                    onClick={() => {
                      setAccYearFilter(""); setAccMonthFilter("");
                      setAccCompanyFilter(""); setAccContactFilter("");
                      setExpenseDateFrom(""); setExpenseDateTo("");
                      setExpenseCategoryFilter(""); setExpenseTypeFilter(""); setExpenseRecognitionFilter("");
                    }}
                    style={{ ...styles.input, background: "#f3f4f6", color: "#374151", cursor: "pointer", border: "1px solid #d1d5db", fontWeight: 600 }}
                  >
                    ↺ Sıfırla
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById("acc-report-printable");
                      if (!el) return;
                      const win = window.open("", "_blank");
                      win.document.write(`
                        <html><head><title>Asklepius CRM — Gelir/Gider Raporu</title>
                        <style>
                          body { font-family: Inter, system-ui, sans-serif; padding: 24px; color: #1f2937; }
                          h2 { color: #8A6322; margin-bottom: 8px; }
                          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
                          th { background: #8A6322; color: #fff; padding: 8px 12px; text-align: left; font-size: 13px; }
                          td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; }
                          tr:nth-child(even) td { background: #fef9f0; }
                          .kpi-row { display: flex; gap: 16px; margin: 16px 0; flex-wrap: wrap; }
                          .kpi { background: #fff8ea; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 18px; }
                          .kpi-label { font-size: 11px; color: #6b7280; }
                          .kpi-value { font-size: 18px; font-weight: 700; }
                          .income { color: #166534; } .expense { color: #991b1b; } .profit { color: #1e40af; }
                        </style></head><body>
                        ${el.innerHTML}
                        </body></html>
                      `);
                      win.document.close();
                      win.focus();
                      setTimeout(() => { win.print(); win.close(); }, 400);
                    }}
                    style={{ ...styles.input, background: "#8A6322", color: "#fff", cursor: "pointer", border: "none", fontWeight: 600 }}
                  >
                    📄 PDF İndir
                  </button>
                </div>
              </Panel>
            </div>

            {/* ── Özet KPI'lar (filtreye göre) ── */}
            <Panel title="Muhasebe Özeti">
              <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}><div style={styles.kpiLabel}>Gerçekleşen gelir</div><div style={styles.kpiValue}>{money(accountingSummary.realizedIncome)}</div></div>
                <div style={styles.kpiCard}><div style={styles.kpiLabel}>Rezervasyon geliri</div><div style={styles.kpiValue}>{money(accountingSummary.pendingIncome)}</div></div>
                <div style={styles.kpiCard}><div style={styles.kpiLabel}>Toplam gelir</div><div style={styles.kpiValue}>{money(accountingSummary.totalIncome)}</div></div>
                <div style={styles.kpiCard}><div style={styles.kpiLabel}>Gider</div><div style={styles.kpiValue}>{money(accountingSummary.expense)}</div></div>
                <div style={styles.kpiCard}><div style={styles.kpiLabel}>Kar / Zarar</div><div style={styles.kpiValue}>{money(accountingSummary.profitLoss)}</div></div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyProfitLoss}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend />
                  <Bar dataKey="realizedIncome" name="Gerçekleşen Gelir" fill="#57C4E5" />
                  <Bar dataKey="pendingIncome" name="Rezervasyon Geliri" fill="#E0A23F" />
                  <Bar dataKey="expense" name="Gider" fill="#C98B2E" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Gider Ekle">
              <div style={styles.form}>
                <InputField label="Başlık" value={expenseForm.title} onChange={(v) => setExpenseForm({ ...expenseForm, title: v })} />
                <InputField label="Tutar" value={expenseForm.amount} onChange={(v) => setExpenseForm({ ...expenseForm, amount: v })} type="number" />
                <InputField label="Tarih" value={expenseForm.date} onChange={(v) => setExpenseForm({ ...expenseForm, date: v })} type="date" />
                <label style={styles.field}>
                  <span style={styles.label}>Kategori</span>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value, customCategory: "" })}
                    style={styles.input}
                  >
                    <option value="software">Software</option>
                    <option value="salary">Salary</option>
                    <option value="rent">Rent</option>
                    <option value="tax">Tax</option>
                    <option value="other">Other</option>
                    <option value="__custom__">+ Yeni kategori ekle…</option>
                  </select>
                  {expenseForm.category === "__custom__" && (
                    <input
                      type="text"
                      placeholder="Kategori adını yazın (örn: araç gideri)"
                      value={expenseForm.customCategory}
                      onChange={(e) => setExpenseForm({ ...expenseForm, customCategory: e.target.value })}
                      style={{ ...styles.input, marginTop: 6 }}
                    />
                  )}
                </label>
                <label style={styles.field}><span style={styles.label}>Tip</span><select value={expenseForm.type} onChange={(e) => setExpenseForm({ ...expenseForm, type: e.target.value })} style={styles.input}><option value="one-time">One-time</option><option value="recurring">Recurring</option></select></label>
                <label style={styles.field}><span style={styles.label}>Tanıma</span><select value={expenseForm.recognition} onChange={(e) => setExpenseForm({ ...expenseForm, recognition: e.target.value })} style={styles.input}><option value="cash">Cash</option><option value="spread">Spread</option></select></label>
                {expenseForm.type === "recurring" && expenseForm.recognition === "spread" && <InputField label="Dağıtılacak ay" value={expenseForm.spreadMonths} onChange={(v) => setExpenseForm({ ...expenseForm, spreadMonths: v })} type="number" />}
                <InputField label="Not" value={expenseForm.note} onChange={(v) => setExpenseForm({ ...expenseForm, note: v })} />
                <button style={styles.primaryBtn} onClick={addExpense} type="button">Gider Ekle</button>
              </div>
            </Panel>

            <div style={{ gridColumn: "1 / -1" }}>
              <Panel title="Girilen Giderler">
                {expenses.length === 0 ? (
                  <p style={styles.mutedDark}>Henüz gider eklenmemiş.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={styles.th}>Tarih</th>
                          <th style={styles.th}>Başlık</th>
                          <th style={styles.th}>Kategori</th>
                          <th style={styles.th}>Tip</th>
                          <th style={styles.th}>Tanıma</th>
                          <th style={styles.th}>Tutar</th>
                          <th style={styles.th}>Not</th>
                          <th style={styles.th}>İşlem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses
                          .slice()
                          .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
                          .map((e) => (
                            <tr key={e.id}>
                              <td style={styles.td}>{e.date || "-"}</td>
                              <td style={styles.td}>{e.title}</td>
                              <td style={styles.td}>{e.category || "-"}</td>
                              <td style={styles.td}>{e.type || "-"}</td>
                              <td style={styles.td}>{e.recognition || "-"}</td>
                              <td style={{ ...styles.td, fontWeight: 600 }}>{money(e.amount)}</td>
                              <td style={{ ...styles.td, color: "#6B7280", fontSize: 12 }}>{e.note || "-"}</td>
                              <td style={styles.td}>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <button
                                    onClick={() => startEditExpense(e)}
                                    style={styles.smallBtn}
                                    type="button"
                                  >
                                    Düzenle
                                  </button>
                                  <button
                                    onClick={() => deleteExpense(e.id)}
                                    style={{ ...styles.smallBtn, background: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" }}
                                    type="button"
                                  >
                                    Sil
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </div>

            <div style={{ gridColumn: "1 / -1" }}>
              <Panel title="Dönemsel Kâr / Zarar">
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {['Dönem','Gerçekleşen gelir','Rezervasyon geliri','Toplam gelir','Gider','Kar / Zarar'].map((h)=><th key={h} style={styles.th}>{h}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyProfitLoss.map((row) => (
                        <tr key={row.month}>
                          <td style={styles.td}>{row.month}</td>
                          <td style={styles.td}>{money(row.realizedIncome)}</td>
                          <td style={styles.td}>{money(row.pendingIncome)}</td>
                          <td style={styles.td}>{money(row.totalIncome)}</td>
                          <td style={styles.td}>{money(row.expense)}</td>
                          <td style={styles.td}>{money(row.profitLoss)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </div>

            {/* ── Detaylı Gelir / Gider Tablosu (PDF'e dahil) ── */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Panel title="Detaylı Gelir / Gider Listesi">
                <div id="acc-report-printable">
                  <h2 style={{ color: "#8A6322", marginBottom: 8 }}>
                    Asklepius CRM — Gelir / Gider Raporu
                    {accYearFilter ? ` (${accYearFilter})` : ""}
                    {accMonthFilter ? ` / ${accMonthFilter}` : ""}
                    {accCompanyFilter ? ` — ${accCompanyFilter}` : ""}
                  </h2>

                  {/* Özet KPI'lar */}
                  <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                    {[
                      { label: "Gerçekleşen Gelir", value: accountingSummary.realizedIncome, cls: "income" },
                      { label: "Rezervasyon Geliri", value: accountingSummary.pendingIncome, cls: "income" },
                      { label: "Toplam Gelir", value: accountingSummary.totalIncome, cls: "income" },
                      { label: "Gider", value: accountingSummary.expense, cls: "expense" },
                      { label: "Kar / Zarar", value: accountingSummary.profitLoss, cls: "profit" },
                    ].map(({ label, value, cls }) => (
                      <div key={label} style={{ background: "#fff8ea", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 18px", minWidth: 130 }}>
                        <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
                        <div style={{
                          fontSize: 18, fontWeight: 700,
                          color: cls === "income" ? "#166534" : cls === "expense" ? "#991b1b" : "#1e40af"
                        }}>{money(value)}</div>
                      </div>
                    ))}
                    <div style={{ background: "#fff8ea", border: "1px solid #e5e7eb", borderRadius: 8, padding: "10px 18px", minWidth: 130 }}>
                      <div style={{ fontSize: 11, color: "#6b7280" }}>Rapor Tarihi</div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{new Date().toLocaleDateString("tr-TR")}</div>
                    </div>
                  </div>

                  {/* Tablo */}
                  {accountingRows.length === 0 ? (
                    <p>Seçilen filtrelere uygun kayıt bulunamadı.</p>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table style={styles.table}>
                        <thead>
                          <tr>
                            {["Tarih","Başlık","Şirket","Tür","Kategori","Tutar",""].map((h) =>
                              <th key={h} style={styles.th}>{h}</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {accountingRows
                            .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
                            .map((r) => (
                            <tr key={r.id}>
                              <td style={styles.td}>{r.date || "-"}</td>
                              <td style={styles.td}>{r.title || "-"}</td>
                              <td style={styles.td}>{r.customer || "-"}</td>
                              <td style={styles.td}>
                                <span style={{
                                  padding: "2px 8px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                                  background: r.kind === "realizedIncome" ? "#dcfce7"
                                    : r.kind === "pendingIncome" ? "#fef9c3"
                                    : "#fee2e2",
                                  color: r.kind === "realizedIncome" ? "#166534"
                                    : r.kind === "pendingIncome" ? "#92400e"
                                    : "#991b1b",
                                }}>
                                  {r.kind === "realizedIncome" ? "Gelir"
                                    : r.kind === "pendingIncome" ? "Rezervasyon"
                                    : "Gider"}
                                </span>
                              </td>
                              <td style={styles.td}>{r.category || r.source || "-"}</td>
                              <td style={{
                                ...styles.td, fontWeight: 600,
                                color: r.kind === "expense" ? "#991b1b" : "#166534"
                              }}>
                                {r.kind === "expense" ? "−" : "+"}{money(r.amount)}
                              </td>
                              <td style={styles.td}>
                                {r.source === "expense" && (
                                  <button
                                    onClick={() => deleteExpense(r.id.replace("expense-", ""))}
                                    style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 16, padding: "2px 6px" }}
                                    title="Sil"
                                  >🗑</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          </section>
        )}

        {view === "gmail" && (
          <section style={styles.grid2}>
            <Panel title="Gmail Bağlantısı">
              {!gmailAuth ? (
                <div style={{ display: "grid", gap: 12 }}>
                  <p>Gmail hesabını bağla, sonra gelen veya gönderilen mailleri listeleyip istediklerini CRM'e aktar.</p>
                  <button type="button" onClick={() => connectGmail()} style={styles.primaryBtn}>Gmail'i Bağla</button>
                  {gmailError && <div style={{ color: "#b91c1c" }}>{gmailError}</div>}
                </div>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={styles.notice}>Gmail bağlı. İstersen mailleri çekip tek tek CRM'e aktarabilirsin.</div>
                  <div style={styles.filters}>
                    <select value={gmailLabelFilter} onChange={(e) => setGmailLabelFilter(e.target.value)} style={styles.input}>
                      <option value="INBOX">Gelen Kutusu</option>
                      <option value="SENT">Gönderilenler</option>
                      <option value="">Tümü</option>
                    </select>
                    <input value={gmailQuery} onChange={(e) => setGmailQuery(e.target.value)} style={styles.input} placeholder="Örn: newer_than:30d" />
                    <button type="button" onClick={() => fetchGmailMessages()} style={styles.smallBtn}>Mailleri Getir</button>
                  </div>
                  <div style={styles.filters}>
                    <button type="button" onClick={handleGmailDisconnect} style={styles.smallDanger}>Gmail Bağlantısını Kes</button>
                    {gmailLoading && <div style={{ alignSelf: "center" }}>Yükleniyor...</div>}
                  </div>
                  {gmailError && <div style={{ color: "#b91c1c" }}>{gmailError}</div>}
                </div>
              )}
            </Panel>

            <Panel title="Mail Detayı ve CRM'e Aktar">
              {!selectedGmailMessage ? (
                <p>Henüz mail seçilmedi.</p>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <Card>
                    <b>{selectedGmailMessage.subject}</b>
                    <div><b>Kimden:</b> {selectedGmailMessage.from}</div>
                    <div><b>Kime:</b> {selectedGmailMessage.to || "-"}</div>
                    <div><b>Tarih:</b> {selectedGmailMessage.date || "-"}</div>
                    <div><b>Özet:</b> {selectedGmailMessage.snippet || "-"}</div>
                    <div>
                      <b>Mail gövdesi:</b>
                      <div style={{ marginTop: 6, whiteSpace: "pre-wrap", background: "#fffdf8", border: "1px solid #f1e4c8", borderRadius: 12, padding: 12, maxHeight: 260, overflow: "auto" }}>
                        {selectedGmailMessage.body || "Mail gövdesi alınamadı."}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, color: "#6B7280" }}>
                      Otomatik öneri: {selectedGmailMessage.suggestedContactId ? "Kişi bulundu" : selectedGmailMessage.suggestedCompanyId ? "Şirket bulundu" : selectedGmailMessage.suggestedDealId ? "Deal bulundu" : "Eşleşme yok"}
                    </div>
                  </Card>

                  <div style={styles.filters}>
                    <select value={mailImportTarget.entityType} onChange={(e) => setMailImportTarget((prev) => ({ ...prev, entityType: e.target.value, entityId: "" }))} style={styles.input}>
                      <option value="contact">Kişi</option>
                      <option value="company">Şirket</option>
                      <option value="deal">Deal</option>
                      <option value="project">Project</option>
                    </select>

                    <select value={mailImportTarget.entityId} onChange={(e) => setMailImportTarget((prev) => ({ ...prev, entityId: e.target.value }))} style={styles.input}>
                      <option value="">Kayıt seç</option>
                      {mailImportTarget.entityType === "contact" && contacts.map((c) => <option key={c.id} value={c.id}>{c.fullName} - {c.email1}</option>)}
                      {mailImportTarget.entityType === "company" && companies.map((c) => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                      {mailImportTarget.entityType === "deal" && deals.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      {mailImportTarget.entityType === "project" && projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>

                    <button
                      type="button"
                      style={styles.primaryBtn}
                      onClick={() => importGmailMessageToCRM(selectedGmailMessage, mailImportTarget)}
                      disabled={!mailImportTarget.entityId}
                    >
                      CRM'e Aktar
                    </button>
                  </div>
                </div>
              )}
            </Panel>

            <div style={{ gridColumn: "1 / -1" }}>
              <Panel title="Mailler">
                {!gmailAuth ? (
                  <p>Önce Gmail hesabını bağla.</p>
                ) : gmailMessages.length === 0 ? (
                  <p>Mail bulunamadı.</p>
                ) : (
                  gmailMessages.map((m) => (
                    <Card key={m.id}>
                      <b>{m.subject}</b>
                      <div>{m.from}</div>
                      <div>{m.date || "-"}</div>
                      <div style={{ marginTop: 6 }}>{m.snippet}</div>
                      <div style={{ marginTop: 8, fontSize: 12, color: "#6B7280" }}>
                        Öneri: {m.suggestedContactId ? `Kişi eşleşti` : m.suggestedCompanyId ? `Şirket eşleşti` : m.suggestedDealId ? `Deal eşleşti` : `Eşleşme yok`}
                      </div>
                      <div style={styles.cardActions}>
                        <button
                          type="button"
                          style={styles.smallBtn}
                          onClick={() => {
                            setSelectedGmailMessage(m);
                            setMailImportTarget({
                              entityType: m.suggestedContactId ? "contact" : m.suggestedCompanyId ? "company" : m.suggestedDealId ? "deal" : "contact",
                              entityId: m.suggestedContactId || m.suggestedCompanyId || m.suggestedDealId || "",
                            });
                          }}
                        >
                          Seç
                        </button>
                        <button
                          type="button"
                          style={styles.primaryBtn}
                          onClick={() => importGmailMessageToCRM(m, {
                            entityType: m.suggestedContactId ? "contact" : m.suggestedCompanyId ? "company" : m.suggestedDealId ? "deal" : "contact",
                            entityId: m.suggestedContactId || m.suggestedCompanyId || m.suggestedDealId || "",
                          })}
                          disabled={!(m.suggestedContactId || m.suggestedCompanyId || m.suggestedDealId)}
                        >
                          Hızlı Aktar
                        </button>
                      </div>
                    </Card>
                  ))
                )}
              </Panel>
            </div>
          </section>
        )}

        {view === "settings" && (
          <section style={styles.grid2}>
            <div style={{ gridColumn: "1 / -1" }}>
              <BackupPanel onRestoreComplete={handleRestoreComplete} />
            </div>
          </section>
        )}

        {view === "import" && (
          <section style={styles.grid2}>
            <div style={{ gridColumn: "1 / -1" }}>
              <BackupPanel onRestoreComplete={handleRestoreComplete} />
            </div>
            <Panel title="Şirketler CSV">
              <label style={styles.fileLabel}>
                <input type="file" accept=".csv" style={styles.fileInput} onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0], "companies")} />
                Şirket CSV yükle
              </label>
              <p style={styles.helpText}>Company Name, City (Billing), Phone, Mobile, Email, Next Step, Last Activity, Owner</p>
            </Panel>
            <Panel title="Kişiler CSV">
              <label style={styles.fileLabel}>
                <input type="file" accept=".csv" style={styles.fileInput} onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0], "contacts")} />
                Kişi CSV yükle
              </label>
              <p style={styles.helpText}>Full Name, Company, Job Title, Mobile, Business, Email 1, City (Business), Next Step, Last Activity, Owner</p>
            </Panel>
            <Panel title="Deals CSV">
              <label style={styles.fileLabel}>
                <input type="file" accept=".csv" style={styles.fileInput} onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0], "deals")} />
                Deal CSV yükle
              </label>
              <p style={styles.helpText}>Customer, Contact Person, Name, Date Received, Status, Est. Revenue, Est. Close Date</p>
            </Panel>
            <Panel title="Projects CSV">
              <label style={styles.fileLabel}>
                <input type="file" accept=".csv" style={styles.fileInput} onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0], "projects")} />
                Project CSV yükle
              </label>
              <p style={styles.helpText}>Company, Contact Person, Name, Status, Start Date, Due Date, Est. Revenue, Owner</p>
            </Panel>
          </section>
        )}

        {view === "edit" && editState.item && (
          <section style={styles.grid2}>
            <Panel title="Kayıt Düzenle">
              <button
                type="button"
                onClick={() => setView(previousView)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#8A6322", fontWeight: 600, fontSize: 13, marginBottom: 12, padding: 0, display: "flex", alignItems: "center", gap: 4 }}
              >
                ← Geri Dön
              </button>
              <form onSubmit={saveEdit} style={styles.form}>
                {editState.type === "company" && (
                  <>
                    <InputField label="Company Name" value={editState.item.companyName} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, companyName: v } })} />
                    <InputField label="City Billing" value={editState.item.billingCity} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, billingCity: v } })} />
                    <InputField label="Phone" value={editState.item.phone} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, phone: v } })} />
                    <InputField label="Mobile" value={editState.item.mobile} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, mobile: v } })} />
                    <InputField label="Email" value={editState.item.email} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, email: v } })} />
                    <InputField label="Next Step" value={editState.item.nextStep} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, nextStep: v } })} />
                    <InputField label="Last Activity" value={editState.item.lastActivity} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, lastActivity: v } })} />
                    <InputField label="Owner" value={editState.item.owner} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, owner: v } })} />
                  </>
                )}
                {editState.type === "contact" && (
                  <>
                    <InputField label="Full Name" value={editState.item.fullName} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, fullName: v } })} />
                    <InputField label="Company" value={editState.item.company} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, company: v } })} />
                    <InputField label="Job Title" value={editState.item.jobTitle} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, jobTitle: v } })} />
                    <InputField label="Mobile" value={editState.item.mobile} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, mobile: v } })} />
                    <InputField label="Business" value={editState.item.business} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, business: v } })} />
                    <InputField label="Email 1" value={editState.item.email1} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, email1: v } })} />
                    <InputField label="City Business" value={editState.item.cityBusiness} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, cityBusiness: v } })} />
                    <InputField label="Next Step" value={editState.item.nextStep} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, nextStep: v } })} />
                    <InputField label="Last Activity" value={editState.item.lastActivity} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, lastActivity: v } })} />
                    <InputField label="Owner" value={editState.item.owner} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, owner: v } })} />
                  </>
                )}
                {editState.type === "deal" && (
                  <>
                    <InputField label="Customer" value={editState.item.customer} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, customer: v } })} />
                    <InputField label="Contact Person" value={editState.item.contactPerson} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, contactPerson: v } })} />
                    <InputField label="Name" value={editState.item.name} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, name: v } })} />
                    <InputField label="Date Received" value={editState.item.dateReceived} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, dateReceived: v } })} />
                    <label style={styles.field}><span style={styles.label}>Status</span><select value={editState.item.status} onChange={(e) => setEditState({ ...editState, item: { ...editState.item, status: e.target.value } })} style={styles.input}>{dealStatuses.map((s) => <option key={s} value={s}>{s}</option>)}</select></label>
                    <InputField label="Est. Revenue" value={editState.item.estRevenue} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, estRevenue: v } })} />
                    <InputField label="Est. Close Date" value={editState.item.estCloseDate} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, estCloseDate: v } })} />
                  </>
                )}
                {editState.type === "project" && (
                  <>
                    <InputField label="Company" value={editState.item.company} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, company: v } })} />
                    <InputField label="Contact Person" value={editState.item.contactPerson} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, contactPerson: v } })} />
                    <InputField label="Name" value={editState.item.name} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, name: v } })} />
                    <InputField label="Status" value={editState.item.status} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, status: v } })} />
                    <InputField label="Start Date" value={editState.item.startDate} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, startDate: v } })} />
                    <InputField label="Due Date" value={editState.item.dueDate} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, dueDate: v } })} />
                    <InputField label="Est. Revenue" value={editState.item.estRevenue} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, estRevenue: v } })} />
                    <InputField label="Owner" value={editState.item.owner} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, owner: v } })} />
                    <InputField label="Not" value={editState.item.note || ""} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, note: v } })} />
                    <label style={styles.field}>
                      <span style={styles.label}>Proje Detayı / Açıklama</span>
                      <textarea
                        value={editState.item.description || ""}
                        onChange={(e) => setEditState({ ...editState, item: { ...editState.item, description: e.target.value } })}
                        style={{ ...styles.textarea, minHeight: 160 }}
                      />
                    </label>
                  </>
                )}
                <button style={styles.primaryBtn}>Kaydet</button>
              </form>
            </Panel>
          </section>
        )}
      </main>

      {editingExpense && (
        <div style={styles.confirmOverlay}>
          <div style={{ ...styles.confirmBox, width: "min(480px, 94vw)" }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Gideri Düzenle</h2>
            <div style={{ display: "grid", gap: 10 }}>
              <label style={styles.field}>
                <span style={styles.label}>Başlık</span>
                <input
                  style={styles.input}
                  value={editingExpense.title}
                  onChange={(e) => setEditingExpense((p) => ({ ...p, title: e.target.value }))}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Tutar</span>
                <input
                  type="number"
                  style={styles.input}
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense((p) => ({ ...p, amount: e.target.value }))}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Tarih</span>
                <input
                  type="date"
                  style={styles.input}
                  value={editingExpense.date}
                  onChange={(e) => setEditingExpense((p) => ({ ...p, date: e.target.value }))}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Kategori</span>
                <input
                  style={styles.input}
                  value={editingExpense.category}
                  onChange={(e) => setEditingExpense((p) => ({ ...p, category: e.target.value }))}
                />
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Tip</span>
                <select
                  style={styles.input}
                  value={editingExpense.type}
                  onChange={(e) => setEditingExpense((p) => ({ ...p, type: e.target.value }))}
                >
                  <option value="one-time">One-time</option>
                  <option value="recurring">Recurring</option>
                </select>
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Tanıma</span>
                <select
                  style={styles.input}
                  value={editingExpense.recognition}
                  onChange={(e) => setEditingExpense((p) => ({ ...p, recognition: e.target.value }))}
                >
                  <option value="cash">Cash</option>
                  <option value="spread">Spread</option>
                </select>
              </label>
              <label style={styles.field}>
                <span style={styles.label}>Not</span>
                <input
                  style={styles.input}
                  value={editingExpense.note || ""}
                  onChange={(e) => setEditingExpense((p) => ({ ...p, note: e.target.value }))}
                />
              </label>
            </div>
            <div style={{ ...styles.filters, marginTop: 16 }}>
              <button style={styles.primaryBtn} type="button" onClick={saveEditExpense}>Kaydet</button>
              <button style={styles.smallBtn} type="button" onClick={() => setEditingExpense(null)}>İptal</button>
            </div>
          </div>
        </div>
      )}

      {confirmState.open && (
        <div style={styles.confirmOverlay}>
          <div style={styles.confirmBox}>
            <p>{confirmState.message}</p>
            <div style={styles.filters}>
              <button style={styles.smallBtn} type="button" onClick={() => confirmState.onConfirm?.(true)}>Evet</button>
              <button style={styles.smallBtn} type="button" onClick={() => confirmState.onConfirm?.(false)}>Hayır</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  app: {
    display: "grid",
    gridTemplateColumns: "300px 1fr",
    minHeight: "100vh",
    background: "#fff8ea",
    fontFamily: "Inter, system-ui, sans-serif",
  },
  sidebar: {
    background: "linear-gradient(180deg, #E0A23F 0%, #C98B2E 100%)",
    padding: 24,
    color: "#fff",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 24,
  },
  logoWrap: { background: "#fffdf8", padding: 10, borderRadius: 18, width: "fit-content", marginBottom: 14 },
  logo: { width: 120, display: "block" },
  brand: { fontSize: 30, fontWeight: 900, letterSpacing: 1, color: "#fff" },
  subbrand: { fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#fff7ea", marginBottom: 16 },
  sidebarMenu: { display: "grid", gap: 10 },
  sidebarButton: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.25)",
    background: "rgba(255,255,255,.15)",
    color: "#fff",
    textAlign: "left",
    cursor: "pointer",
  },
  sidebarButtonActive: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.25)",
    background: "#fff",
    color: "#8A6322",
    textAlign: "left",
    cursor: "pointer",
    fontWeight: 700,
  },
  main: { padding: 24, display: "grid", gap: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, flexWrap: "wrap" },
  h1: { margin: 0, fontSize: 34, color: "#8A6322" },
  h2: { margin: "0 0 16px", fontSize: 20, color: "#8A6322" },
  mutedDark: { color: "#6B7280", marginTop: 6 },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: 12 },
  stat: {
    background: "#fff",
    borderRadius: 16,
    padding: 16,
    boxShadow: "0 8px 24px rgba(138,99,34,.10)",
    border: "1px solid rgba(224,162,63,.2)",
  },
  statLabel: { fontSize: 12, color: "#8A6322" },
  statValue: { fontSize: 20, fontWeight: 800, marginTop: 6, color: "#2B2B2B" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  panel: {
    background: "#fff",
    borderRadius: 20,
    padding: 18,
    boxShadow: "0 10px 30px rgba(138,99,34,.10)",
    border: "1px solid rgba(224,162,63,.2)",
  },
  form: { display: "grid", gap: 12 },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 13, color: "#8A6322", fontWeight: 600 },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e7d7ba",
    outline: "none",
    fontSize: 14,
    background: "#fffdf8",
    color: "#2B2B2B",
  },
  textarea: {
    width: "100%",
    minHeight: 110,
    padding: "12px 14px",
    borderRadius: 12,
    border: "1px solid #e7d7ba",
    outline: "none",
    fontSize: 14,
    background: "#fffdf8",
    color: "#2B2B2B",
  },
  primaryBtn: {
    padding: "12px 14px",
    borderRadius: 12,
    border: "none",
    background: "#57C4E5",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
  },
  smallBtn: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    background: "#fff",
    cursor: "pointer",
  },
  smallDanger: {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #fca5a5",
    background: "#fff1f1",
    cursor: "pointer",
    color: "#b91c1c",
  },
  card: { border: "1px solid #f1e4c8", borderRadius: 16, padding: 14, marginBottom: 12, background: "#fffdf8" },
  cardActions: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  filters: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 },
  notice: { backgroundColor: "#fff3cd", border: "1px solid #E0A23F", color: "#8A6322", padding: "12px 16px", borderRadius: 12 },
  fileLabel: {
    display: "inline-block",
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #57C4E5",
    background: "#f2fbfe",
    cursor: "pointer",
    color: "#2B2B2B",
    fontSize: 14,
    fontWeight: 700,
  },
  fileInput: { display: "none" },
  helpText: { margin: "12px 0 0", color: "#8A6322" },
  table: { width: "100%", borderCollapse: "collapse" },
  th: { textAlign: "left", padding: 10, borderBottom: "1px solid #eadfca", color: "#8A6322", fontSize: 13 },
  td: { padding: 10, borderBottom: "1px solid #f1e4c8", fontSize: 14, verticalAlign: "top" },
  confirmOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  confirmBox: {
    width: "min(520px, 92vw)",
    background: "#fff",
    borderRadius: 16,
    padding: 20,
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    background: "#fff",
    borderRadius: 14,
    padding: 16,
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    border: "1px solid rgba(0,0,0,0.04)",
  },
  kpiLabel: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  kpiValue: { fontSize: 24, fontWeight: 700, color: "#111827" },
};
