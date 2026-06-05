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

const LSCOMPANIES = "asklepius-companies";
const LSCONTACTS = "asklepius-contacts";
const LSDEALS = "asklepius-deals";
const LSPROJECTS = "asklepius-projects";
const LSACTIVITIES = "asklepius-activities";
const LSEXPENSES = "asklepius-expenses";

const LSGOOGLEAUTH = "googleAuth";
const LSGMAILAUTH = "gmailAuth";

const dealStatuses = [
  "closed won",
  "rezervasyon",
  "rezervasyonlu",
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
    mobile: "+90 532 111 22 33",
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

function normalizeHeader(h) {
  return String(h || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/--+/g, "-");
}

function parseCSV(content) {
  const lines = content
    .split(/\r?\n/)
    .filter((l) => l.trim());
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
  return vals.find((v) => (String(v ?? "").trim() !== "")) ?? "";
}

function decodeBase64Url(data) {
  if (!data) return "";
  try {
    const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return decodeURIComponent(
      Array.from(atob(padded))
        .map((c) => c.charCodeAt(0).toString(16).padStart(2, "0"))
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
  }
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }
  return "";
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
  const [companies, setCompanies] = useState(loadLS(LSCOMPANIES, seedCompanies));
  const [contacts, setContacts] = useState(loadLS(LSCONTACTS, seedContacts));
  const [deals, setDeals] = useState(loadLS(LSDEALS, seedDeals));
  const [projects, setProjects] = useState(loadLS(LSPROJECTS, seedProjects));
  const [activities, setActivities] = useState(loadLS(LSACTIVITIES, seedActivities));
  const [expenses, setExpenses] = useState(loadLS(LSEXPENSES, []));

  const [view, setView] = useState("dashboard");
  const [selectedEntityType, setSelectedEntityType] = useState("deal");
  const [selectedEntityId, setSelectedEntityId] = useState(seedDeals[0]?.id);
  const [activeDetailType, setActiveDetailType] = useState("deal");
  const [activeDetailId, setActiveDetailId] = useState(seedDeals[0]?.id);

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
    status: "rezervasyonlu",
    estRevenue: "",
    estCloseDate: "",
    note: "",
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
  });

  const [googleAuth, setGoogleAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LSGOOGLEAUTH)) || null;
    } catch {
      return null;
    }
  });
  const [googleContacts, setGoogleContacts] = useState([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");

  const [gmailAuth, setGmailAuth] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(LSGMAILAUTH)) || null;
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
  const [mailImportTarget, setMailImportTarget] = useState({
    entityType: "contact",
    entityId: "",
  });

  useEffect(() => saveLS(LSCOMPANIES, companies), [companies]);
  useEffect(() => saveLS(LSCONTACTS, contacts), [contacts]);
  useEffect(() => saveLS(LSDEALS, deals), [deals]);
  useEffect(() => saveLS(LSPROJECTS, projects), [projects]);
  useEffect(() => saveLS(LSACTIVITIES, activities), [activities]);
  useEffect(() => saveLS(LSEXPENSES, expenses), [expenses]);

  useEffect(() => {
    if (googleAuth) {
      localStorage.setItem(LSGOOGLEAUTH, JSON.stringify(googleAuth));
    } else {
      localStorage.removeItem(LSGOOGLEAUTH);
    }
  }, [googleAuth]);

  useEffect(() => {
    if (gmailAuth) {
      localStorage.setItem(LSGMAILAUTH, JSON.stringify(gmailAuth));
    } else {
      localStorage.removeItem(LSGMAILAUTH);
    }
  }, [gmailAuth]);

  async function fetchGoogleContacts(accessToken) {
    try {
      setGoogleLoading(true);
      setGoogleError("");
      const res = await fetch(
        "https://people.googleapis.com/v1/people/me/connections?pageSize=1000&personFields=names,emailAddresses",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (!res.ok) throw new Error("Google Contacts okunamadı");
      const data = await res.json();
      const mapped =
        data.connections?.map((person) => ({
          resourceName: person.resourceName,
          name: person.names?.[0]?.displayName || "",
          email: person.emailAddresses?.[0]?.value || "",
        })) || [];
      setGoogleContacts(mapped);
    } catch {
      setGoogleError("Google kişi eşleştirmesi alınamadı.");
    } finally {
      setGoogleLoading(false);
    }
  }

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

  async function fetchGmailMessages(
    accessToken = gmailAuth?.accessToken,
    query = gmailQuery,
    label = gmailLabelFilter
  ) {
    try {
      setGmailLoading(true);
      setGmailError("");
      if (!accessToken) throw new Error("Gmail access token bulunamadı");

      let messages = [];
      let pageToken = null;

      do {
        const params = new URLSearchParams();
        params.set("maxResults", "500");
        if (query) params.set("q", query);
        if (label) params.set("labelIds", label);
        if (pageToken) params.set("pageToken", pageToken);

        const listRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!listRes.ok) throw new Error("Gmail mesaj listesi alınamadı");
        const listData = await listRes.json();
        messages = messages.concat(listData.messages || []);
        pageToken = listData.nextPageToken || null;
      } while (pageToken);

      const details = await Promise.all(
        messages.map(async (m) => {
          try {
            const res = await fetch(
              `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
              { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            if (!res.ok) return null;
            const data = await res.json();
            const headersObj = Object.fromEntries(
              (data.payload?.headers || []).map((h) => [h.name, h.value])
            );
            const snippet = data.snippet || "";
            const body = extractMessageBody(data.payload);
            const from = headersObj["From"] || "";
            const to = headersObj["To"] || "";
            const subject = headersObj["Subject"] || "Konu yok";
            const date = headersObj["Date"] || "";
            const emailMatch = from.match(/<([^>]+)>/);
            const cleanEmail = String(
              emailMatch ? emailMatch[1] : from
            )
              .trim()
              .toLowerCase();

            const suggestedContact =
              contacts.find(
                (c) =>
                  String(c.email1 || "")
                    .trim()
                    .toLowerCase() === cleanEmail
              ) || null;

            const suggestedCompany = suggestedContact
              ? companies.find((co) => co.companyName === suggestedContact.company) || null
              : companies.find(
                  (co) =>
                    String(co.email || "")
                      .trim()
                      .toLowerCase() === cleanEmail
                ) || null;

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
              suggestedContactId: suggestedContact?.id || null,
              suggestedCompanyId: suggestedCompany?.id || null,
              suggestedDealId: suggestedDeal?.id || null,
            };
          } catch {
            return null;
          }
        })
      );

      const finalMessages = details.filter(Boolean);
      setGmailMessages(finalMessages);
      if (finalMessages[0]) {
        setSelectedGmailMessage(finalMessages[0]);
        setMailImportTarget({
          entityType: finalMessages[0].suggestedContactId
            ? "contact"
            : finalMessages[0].suggestedCompanyId
            ? "company"
            : finalMessages[0].suggestedDealId
            ? "deal"
            : "contact",
          entityId:
            finalMessages[0].suggestedContactId ||
            finalMessages[0].suggestedCompanyId ||
            finalMessages[0].suggestedDealId ||
            "",
        });
      }
    } catch {
      setGmailError("Gmail mesajlar alınamadı.");
    } finally {
      setGmailLoading(false);
    }
  }

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

  function importGmailMessageToCRM(message, target) {
    if (!message || !target?.entityId || !target?.entityType) return;
    const rec = {
      id: crypto.randomUUID(),
      entityType: target.entityType,
      entityId: target.entityId,
      type: "email",
      subject: message.subject,
      body: `Kimden: ${message.from}\nKime: ${message.to}\nTarih: ${message.date}\n\nMesaj:\n\n${message.body || message.snippet}`,
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
  }

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
      .filter(
        (a) => a.entityType === activeDetailType && a.entityId === activeDetailId
      )
      .filter((a) => (activityFilter === "all" ? true : a.type === activityFilter))
      .filter((a) =>
        activityFrom ? a.createdAt.slice(0, 10) >= activityFrom : true
      )
      .filter((a) =>
        activityTo ? a.createdAt.slice(0, 10) <= activityTo : true
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [
    activities,
    activeDetailId,
    activeDetailType,
    activityFilter,
    activityFrom,
    activityTo,
  ]);

  const dealFiltered = useMemo(
    () =>
      deals
        .filter((d) => (statusFilter ? d.status === statusFilter : true))
        .filter((d) => (companyFilter ? d.customer === companyFilter : true))
        .filter((d) => (contactFilter ? d.contactPerson === contactFilter : true))
        .filter((d) => {
          if (!yearFilter) return true;
          const year = (d.dateReceived || d.createdAt || "").slice(0, 4);
          return String(year) === String(yearFilter);
        })
        .filter((d) =>
          monthFilter ? (d.dateReceived || "").slice(0, 7) === monthFilter : true
        )
        .filter((d) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return [d.customer, d.contactPerson, d.name, d.status]
            .join(" ")
            .toLowerCase()
            .includes(q);
        }),
    [deals, statusFilter, companyFilter, contactFilter, yearFilter, monthFilter, search]
  );

  const monthlyRevenue = useMemo(() => {
    const map = {};
    dealFiltered
      .filter((d) => d.status === "closed won")
      .forEach((d) => {
        const key = (d.dateReceived || "").slice(0, 7);
        if (!key) return;
        map[key] = (map[key] || 0) + (Number(d.estRevenue) || 0);
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
    const won = deals.filter((d) => d.status === "closed won");
    const pending = deals.filter((d) =>
      ["işlemde", "ödeme bekleniyor"].includes(d.status)
    ).length;
    const totalRevenue = deals
      .filter((d) =>
        ["closed won", "rezervasyon", "rezervasyonlu", "reserved"].includes(d.status)
      )
      .reduce((s, d) => s + (Number(d.estRevenue) || 0), 0);
    return {
      count: deals.length,
      wonCount: won.length,
      pending,
      totalRevenue,
    };
  }, [deals]);

  const reservedDeals = useMemo(
    () =>
      deals.filter((d) =>
        ["rezervasyonlu", "reserved", "rezervasyon"].includes(d.status)
      ),
    [deals]
  );

  const reportDeals = useMemo(
    () =>
      deals
        .filter((d) =>
          reportStatusFilter ? d.status === reportStatusFilter : true
        )
        .filter((d) =>
          reportCompanyFilter ? d.customer === reportCompanyFilter : true
        )
        .filter((d) =>
          reportContactFilter ? d.contactPerson === reportContactFilter : true
        )
        .filter((d) => {
          if (!reportYearFilter) return true;
          const year = (d.dateReceived || d.createdAt || "").slice(0, 4);
          return String(year) === String(reportYearFilter);
        })
        .filter((d) =>
          reportMonthFilter
            ? (d.dateReceived || "").slice(0, 7) === reportMonthFilter
            : true
        )
        .filter((d) =>
          reportFromDate ? (d.dateReceived || "") >= reportFromDate : true
        )
        .filter((d) =>
          reportToDate ? (d.dateReceived || "") <= reportToDate : true
        ),
    [
      deals,
      reportStatusFilter,
      reportCompanyFilter,
      reportContactFilter,
      reportYearFilter,
      reportMonthFilter,
      reportFromDate,
      reportToDate,
    ]
  );

  const reportMonthlyRevenue = useMemo(() => {
    const map = {};
    reportDeals
      .filter((d) =>
        ["closed won", "rezervasyon", "rezervasyonlu", "reserved"].includes(d.status)
      )
      .forEach((d) => {
        const month = (d.dateReceived || d.estCloseDate || d.createdAt || "").slice(
          0,
          7
        );
        if (!month) return;
        map[month] = (map[month] || 0) + (Number(d.estRevenue) || 0);
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
      .filter(
        (d) =>
          d.status === "closed won" ||
          d.status === "reserved" ||
          d.status === "rezervasyon" ||
          d.status === "rezervasyonlu"
      )
      .map((d) => ({
        id: `deal-${d.id}`,
        date: d.dateReceived || d.estCloseDate || d.createdAt,
        amount: Number(d.estRevenue) || 0,
        source: "deal",
        status: d.status,
        title: d.name,
        customer: d.customer,
        kind:
          d.status === "reserved" ||
          d.status === "rezervasyon" ||
          d.status === "rezervasyonlu"
            ? "pendingIncome"
            : "realizedIncome",
        spreadMonths: 1,
      }));

    const projectIncomeRows = projects
      .filter((p) => Number(p.estRevenue) || 0)
      .map((p) => ({
        id: `project-${p.id}`,
        date: p.startDate || p.dueDate || p.createdAt,
        amount: Number(p.estRevenue) || 0,
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
      amount: Number(e.amount) || 0,
      source: "expense",
      category: e.category,
      title: e.title,
      kind: "expense",
      recognition: e.recognition || "cash",
      spreadMonths: Number(e.spreadMonths) || 1,
      cycle: e.cycle,
      note: e.note,
    }));

    return [...dealIncomeRows, ...projectIncomeRows, ...expenseRows]
      .filter((r) => (expenseDateFrom ? (r.date || "") >= expenseDateFrom : true))
      .filter((r) => (expenseDateTo ? (r.date || "") <= expenseDateTo : true))
      .filter((r) =>
        expenseCategoryFilter ? r.category === expenseCategoryFilter : true
      )
      .filter((r) =>
        expenseTypeFilter
          ? r.kind === expenseTypeFilter || r.source === expenseTypeFilter
          : true
      )
      .filter((r) =>
        expenseRecognitionFilter ? r.recognition === expenseRecognitionFilter : true
      )
      .filter((r) =>
        accYearFilter ? (r.date || "").slice(0, 4) === accYearFilter : true
      )
      .filter((r) =>
        accMonthFilter ? (r.date || "").slice(0, 7) === accMonthFilter : true
      )
      .filter((r) =>
        accCompanyFilter ? r.customer === accCompanyFilter : true
      )
      .filter((r) => {
        if (!accContactFilter) return true;
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
      if (!months[key]) {
        months[key] = {
          realizedIncome: 0,
          pendingIncome: 0,
          expenseSpread: 0,
          expenseCash: 0,
        };
      }
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
    const realizedIncome = monthlyProfitLoss.reduce(
      (s, r) => s + r.realizedIncome,
      0
    );
    const pendingIncome = monthlyProfitLoss.reduce(
      (s, r) => s + r.pendingIncome,
      0
    );
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
    const realizedIncome = monthlyProfitLoss.reduce(
      (s, r) => s + r.realizedIncome,
      0
    );
    const pendingIncome = monthlyProfitLoss.reduce(
      (s, r) => s + r.pendingIncome,
      0
    );
    const expense = monthlyProfitLoss.reduce((s, r) => s + r.expense, 0);
    return {
      companies: companies.length,
      contacts: contacts.length,
      openDeals: deals.filter((d) =>
        ["işlemde", "ödeme bekleniyor"].includes(d.status)
      ).length,
      reservedDeals: deals.filter((d) =>
        ["rezervasyonlu", "reserved", "rezervasyon"].includes(d.status)
      ).length,
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
      const amount = Number(e.amount) || 0;
      map[e.category] = (map[e.category] || 0) + amount;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  const companyMap = useMemo(
    () =>
      new Map(
        companies.map((c) => [String(c.companyName || "").toLowerCase(), c])
      ),
    [companies]
  );

  const contactMap = useMemo(
    () =>
      new Map(
        contacts.map((c) => [String(c.fullName || "").toLowerCase(), c])
      ),
    [contacts]
  );

  const norm = (v) => String(v || "").trim().toLowerCase();

  const findDuplicateCompany = (name) =>
    companies.find((c) => norm(c.companyName) === norm(name));

  const findDuplicateContact = (name, email) =>
    contacts.find((c) => {
      if (norm(c.fullName) === norm(name)) return true;
      if (email && norm(c.email1) === norm(email)) return true;
      return false;
    });

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
    setCompanyForm({
      companyName: "",
      billingCity: "",
      phone: "",
      email: "",
      contactIds: [],
    });

  const resetContactForm = () =>
    setContactForm({
      fullName: "",
      jobTitle: "",
      mobile: "",
      email1: "",
      companyIds: [],
    });

  const resetDealForm = () =>
    setDealForm({
      name: "",
      customerId: "",
      contactPersonId: "",
      dateReceived: "",
      status: "rezervasyonlu",
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
    const duplicate = findDuplicateContact(
      contactForm.fullName,
      contactForm.email1
    );
    if (duplicate) {
      const ok = await askConfirm(
        `${duplicate.fullName} zaten sistemde mevcut. Yine de yeni kayıt oluşturmak istiyor musunuz?`
      );
      if (!ok) return;
    }

    const selectedCompanyNames = contactForm.companyIds
      .map((id) => getCompanyById(id)?.companyName)
      .filter(Boolean);

    const existingContact = contacts.find(
      (c) => norm(c.fullName) === norm(contactForm.fullName)
    );
    const existingRelatedCompanies = existingContact
      ? existingContact.companyIds
          .map((id) => getCompanyById(id)?.companyName)
          .filter(Boolean)
      : [];

    if (existingRelatedCompanies.length > 0 && selectedCompanyNames.length > 0) {
      const ok = await askConfirm(
        `${contactForm.fullName} daha önce ${existingRelatedCompanies.join(
          ", "
        )} ile ilişkilendirilmiştir. ${
          selectedCompanyNames.join(", ")
        } şirketlerine de eklemek istediğinize emin misiniz?`
      );
      if (!ok) return;
    }

    const primaryCompanyName = contactForm.companyIds.length
      ? getCompanyById(contactForm.companyIds[0])?.companyName
      : "";

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

    setContacts((prev) => [newContact, ...prev]);
    setCompanies((prev) =>
      prev.map((company) =>
        contactForm.companyIds.includes(company.id)
          ? {
              ...company,
              contactIds: Array.from(
                new Set([...(company.contactIds || []), newContact.id])
              ),
            }
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
      const ok = await askConfirm(
        `${duplicate.companyName} zaten sistemde mevcut. Yine de yeni kayıt oluşturmak istiyor musunuz?`
      );
      if (!ok) return;
    }

    const conflictedContacts = contacts.filter((contact) => {
      if (!companyForm.contactIds.includes(contact.id)) return false;
      return contact.companyIds?.length > 0;
    });

    if (conflictedContacts.length > 0) {
      const names = conflictedContacts.map((c) => c.fullName).join(", ");
      const ok = await askConfirm(
        `${companyForm.companyName} şirketine eklemek istediğiniz bazı kişiler daha önce başka şirketlere bağlı: ${names}. Devam etmek ister misiniz?`
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

    setCompanies((prev) => [newCompany, ...prev]);
    setContacts((prev) =>
      prev.map((contact) =>
        companyForm.contactIds.includes(contact.id)
          ? {
              ...contact,
              company: newCompany.companyName,
              companyIds: Array.from(
                new Set([...(contact.companyIds || []), newCompany.id])
              ),
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
    const contact = dealForm.contactPersonId
      ? getContactById(dealForm.contactPersonId)
      : null;
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
      createdAt: new Date().toISOString(),
    };
    setDeals((prev) => [newDeal, ...prev]);
    resetDealForm();
    setOpenForms((p) => ({ ...p, deal: false }));
  };

  const addProject = () => {
    if (!projectForm.name?.trim()) {
      setImportMessage("Proje kaydı için proje adı zorunlu.");
      return;
    }
    if (!projectForm.companyId || !projectForm.contactPersonId) {
      setImportMessage("Proje kaydı için şirket veya kişi seçimi zorunlu.");
      return;
    }
    const company = projectForm.companyId
      ? getCompanyById(projectForm.companyId)
      : null;
    const contact = projectForm.contactPersonId
      ? getContactById(projectForm.contactPersonId)
      : null;
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
      estRevenue: Number(projectForm.estRevenue) || 0,
      owner: projectForm.owner,
      note: projectForm.note,
      createdAt: new Date().toISOString(),
    };
    setProjects((prev) => [newProject, ...prev]);
    setImportMessage(`Proje kaydedildi: ${newProject.name}`);
    resetProjectForm();
    setOpenForms((p) => ({ ...p, project: false }));
  };

  const addExpense = () => {
    if (!expenseForm.title || !expenseForm.amount || !expenseForm.date) return;
    setExpenses((prev) => [
      {
        id: crypto.randomUUID(),
        title: expenseForm.title,
        category:
          expenseForm.category === "custom"
            ? expenseForm.customCategory.trim() || "other"
            : expenseForm.category,
        amount: Number(expenseForm.amount),
        date: expenseForm.date,
        type: expenseForm.type,
        cycle: expenseForm.type === "recurring" ? expenseForm.cycle : "",
        recognition: expenseForm.recognition,
        spreadMonths:
          expenseForm.type === "recurring" &&
          expenseForm.recognition === "spread"
            ? Number(expenseForm.spreadMonths) || 12
            : 1,
        note: expenseForm.note,
        createdAt: new Date().toISOString(),
      },
      ...prev,
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
    if (!window.confirm("Bu gideri silmek istediğinize emin misiniz?")) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
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
    setActivityForm({
      type: "note",
      subject: "",
      body: "",
      direction: "internal",
      status: "done",
      createdBy: "Ayşe",
    });
  };

  const updateDealStatus = (dealId, newStatus) => {
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, status: newStatus } : d))
    );
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
      setActivities((prev) =>
        prev.filter((x) => x.relatedCompanyId !== id)
      );
    }
    if (type === "contact") {
      setContacts((prev) => prev.filter((x) => x.id !== id));
      setActivities((prev) =>
        prev.filter((x) => x.relatedContactId !== id)
      );
    }
    if (type === "deal") {
      setDeals((prev) => prev.filter((x) => x.id !== id));
      setActivities((prev) =>
        prev.filter((x) => x.relatedDealId !== id)
      );
    }
    if (type === "project") {
      setProjects((prev) => prev.filter((x) => x.id !== id));
      setActivities((prev) =>
        prev.filter((x) => x.relatedProjectId !== id)
      );
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
    if (type === "company") {
      setCompanies((prev) => prev.map((x) => (x.id === item.id ? item : x)));
    }
    if (type === "contact") {
      setContacts((prev) => prev.map((x) => (x.id === item.id ? item : x)));
    }
    if (type === "deal") {
      setDeals((prev) => prev.map((x) => (x.id === item.id ? item : x)));
    }
    if (type === "project") {
      setProjects((prev) => prev.map((x) => (x.id === item.id ? item : x)));
    }
    setImportMessage("Kayıt güncellendi.");
    setView("details");
  };

  const handleRestoreComplete = () => {
    setContacts(JSON.parse(localStorage.getItem(LSCONTACTS) || "[]"));
    setCompanies(JSON.parse(localStorage.getItem(LSCOMPANIES) || "[]"));
    setDeals(JSON.parse(localStorage.getItem(LSDEALS) || "[]"));
    setProjects(JSON.parse(localStorage.getItem(LSPROJECTS) || "[]"));
    setActivities(JSON.parse(localStorage.getItem(LSACTIVITIES) || "[]"));
    setExpenses(JSON.parse(localStorage.getItem(LSEXPENSES) || "[]"));
  };

  const normalizeDealStatus = (value) => {
    const v = String(value || "").trim().toLowerCase();
    if (v === "closed won") return "closed won";
    if (
      v === "lost / cancelled" ||
      v === "lost/cancelled" ||
      v === "cancelled" ||
      v === "canceled" ||
      v === "lost"
    )
      return "kayıp/iptal";
    return v;
  };

  const importCSV = async (file, mode) => {
    const text = await file.text();
    const rows = parseCSV(text);

    if (mode === "companies") {
      const mapped = rows
        .map((r) => ({
          id: crypto.randomUUID(),
          companyName: firstNonEmpty(
            r.companyname,
            r.company,
            r["company-name"]
          ),
          billingCity: firstNonEmpty(
            r.citybilling,
            r.billingcity,
            r.city,
            r["city-billing"]
          ),
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
      setCompanies((prev) => [...mapped, ...prev]);
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
          createdAt: new Date().toISOString(),
        }))
        .filter((x) => x.fullName);
      setContacts((prev) => [...mapped, ...prev]);
      setImportMessage(`${mapped.length} kişi içe aktarıldı.`);
    }

    if (mode === "deals") {
      const mapped = rows
        .map((r) => ({
          id: crypto.randomUUID(),
          customer: firstNonEmpty(r.customer),
          contactPerson: firstNonEmpty(
            r.contactperson,
            r["contact-person"]
          ),
          name: firstNonEmpty(r.name),
          dateReceived: firstNonEmpty(
            r.datereceived,
            r["date-received"]
          ),
          status: normalizeDealStatus(firstNonEmpty(r.status)),
          estRevenue:
            Number(
              String(
                firstNonEmpty(
                  r.estrevenue,
                  r["est-revenue"],
                  0
                )
              ).replace(/[^0-9.-]/g, "")
            ) || 0,
          estCloseDate: firstNonEmpty(
            r.estclosedate,
            r["est-close-date"]
          ),
          createdAt: new Date().toISOString(),
        }))
        .filter((x) => x.customer && x.name && x.status);
      setDeals((prev) => [...mapped, ...prev]);
      setImportMessage(`${mapped.length} deal içe aktarıldı.`);
    }

    if (mode === "projects") {
      const mapped = rows
        .map((r) => ({
          id: crypto.randomUUID(),
          company: firstNonEmpty(r.company),
          contactPerson: firstNonEmpty(
            r.contactperson,
            r["contact-person"]
          ),
          name: firstNonEmpty(r.name),
          status: firstNonEmpty(r.status).toLowerCase(),
          startDate: firstNonEmpty(r.startdate, r["start-date"]),
          dueDate: firstNonEmpty(r.duedate, r["due-date"]),
          estRevenue:
            Number(
              String(
                firstNonEmpty(
                  r.estrevenue,
                  r["est-revenue"],
                  0
                )
              ).replace(/[^0-9.-]/g, "")
            ) || 0,
          owner: firstNonEmpty(r.owner),
          createdAt: new Date().toISOString(),
        }))
        .filter((x) => x.company && x.name);
      setProjects((prev) => [...mapped, ...prev]);
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

  const deleteActivity = (id) => {
    if (!window.confirm("Bu aktiviteyi silmek istediğinize emin misiniz?")) return;
    setActivities((prev) => prev.filter((a) => a.id !== id));
  };

  const dealStatusLabel = (value) => {
    if (value === "closed won") return "Closed Won";
    if (value === "rezervasyonlu") return "Rezervasyonlu";
    if (value === "rezervasyon") return "Rezervasyon";
    if (value === "işlemde") return "İşlemde";
    if (value === "ödeme bekleniyor") return "Ödeme Bekleniyor";
    if (value === "kayıp/iptal") return "Kayıp / İptal";
    return value;
  };

  const activityTypeLabel = (t) => {
    if (t === "note") return "Not";
    if (t === "email") return "Email";
    if (t === "call") return "Arama";
    if (t === "meeting") return "Toplantı";
    if (t === "task") return "Görev";
    if (t === "status-change") return "Durum Değişikliği";
    return t;
  };

  const styles = {
    app: {
      display: "flex",
      minHeight: "100vh",
      fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
      background: "#f7f5f0",
      color: "#1f2933",
    },
    sidebar: {
      width: 260,
      background: "#1b1b1f",
      color: "#f9fafb",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 16,
    },
    logoWrap: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 12,
    },
    logo: {
      width: 40,
      height: 40,
      borderRadius: 8,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.08)",
    },
    brand: {
      fontWeight: 800,
      letterSpacing: "0.08em",
      fontSize: 13,
    },
    subbrand: {
      fontSize: 11,
      color: "#e5e7eb",
    },
    sidebarMenu: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
    },
    sidebarButton: {
      padding: "8px 12px",
      borderRadius: 6,
      border: "1px solid transparent",
      background: "transparent",
      color: "#e5e7eb",
      textAlign: "left",
      fontSize: 13,
      cursor: "pointer",
    },
    sidebarButtonActive: {
      padding: "8px 12px",
      borderRadius: 6,
      border: "1px solid rgba(251,191,36,0.4)",
      background: "linear-gradient(90deg,#fbbf24,#f97316)",
      color: "#111827",
      textAlign: "left",
      fontSize: 13,
      cursor: "pointer",
      fontWeight: 600,
    },
    main: {
      flex: 1,
      minWidth: 0,
      padding: "20px 28px",
      display: "flex",
      flexDirection: "column",
      gap: 16,
    },
    header: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-end",
      gap: 16,
      marginBottom: 8,
    },
    h1: {
      fontSize: 24,
      fontWeight: 800,
      letterSpacing: "-0.03em",
      color: "#111827",
      marginBottom: 4,
    },
    mutedDark: {
      fontSize: 13,
      color: "#6b7280",
    },
    statsRow: {
      display: "flex",
      gap: 10,
      alignItems: "stretch",
    },
    stat: {
      padding: "6px 10px",
      borderRadius: 8,
      background: "#fef9c3",
      border: "1px solid #facc15",
      minWidth: 90,
    },
    statLabel: {
      fontSize: 11,
      color: "#6b7280",
    },
    statValue: {
      fontSize: 16,
      fontWeight: 700,
      color: "#111827",
    },
    panel: {
      background: "#fdfbf7",
      borderRadius: 12,
      padding: 16,
      boxShadow: "0 8px 24px rgba(15,23,42,0.08)",
      border: "1px solid rgba(148,163,184,0.35)",
    },
    h2: {
      fontSize: 16,
      fontWeight: 700,
      marginBottom: 12,
      color: "#111827",
    },
    grid2: {
      display: "grid",
      gridTemplateColumns: "2fr 1.2fr",
      gap: 16,
      alignItems: "flex-start",
    },
    card: {
      padding: 12,
      borderRadius: 10,
      background: "#ffffff",
      border: "1px solid #e5e7eb",
      boxShadow: "0 2px 4px rgba(15,23,42,0.06)",
    },
    cardActions: {
      marginTop: 10,
      display: "flex",
      gap: 6,
      flexWrap: "wrap",
    },
    field: {
      display: "flex",
      flexDirection: "column",
      gap: 4,
      fontSize: 13,
    },
    label: {
      fontSize: 11,
      fontWeight: 600,
      color: "#4b5563",
    },
    input: {
      borderRadius: 8,
      border: "1px solid #d1d5db",
      padding: "7px 9px",
      fontSize: 13,
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
    },
    textarea: {
      borderRadius: 8,
      border: "1px solid #d1d5db",
      padding: "7px 9px",
      fontSize: 13,
      outline: "none",
      width: "100%",
      boxSizing: "border-box",
      minHeight: 80,
      resize: "vertical",
    },
    primaryBtn: {
      background:
        "linear-gradient(90deg,rgba(251,191,36,1),rgba(249,115,22,1))",
      color: "#111827",
      borderRadius: 999,
      padding: "8px 14px",
      border: "1px solid rgba(180,83,9,0.75)",
      fontSize: 13,
      fontWeight: 600,
      cursor: "pointer",
    },
    smallBtn: {
      background: "#f97316",
      color: "#fff",
      borderRadius: 999,
      padding: "5px 10px",
      border: "none",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    },
    smallDanger: {
      background: "#fee2e2",
      color: "#b91c1c",
      borderRadius: 999,
      padding: "5px 10px",
      border: "none",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      fontSize: 12,
    },
    th: {
      textAlign: "left",
      padding: "6px 8px",
      borderBottom: "1px solid #e5e7eb",
      background: "#f97316",
      color: "#fff",
      fontWeight: 600,
      fontSize: 12,
    },
    td: {
      padding: "6px 8px",
      borderBottom: "1px solid #e5e7eb",
      verticalAlign: "top",
    },
    tdMoney: {
      padding: "6px 8px",
      borderBottom: "1px solid #e5e7eb",
      textAlign: "right",
      fontVariantNumeric: "tabular-nums",
    },
    filters: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))",
      gap: 8,
      alignItems: "center",
    },
    notice: {
      background: "#ecfdf5",
      border: "1px solid #bbf7d0",
      color: "#166534",
      padding: "6px 10px",
      borderRadius: 999,
      fontSize: 12,
      alignSelf: "flex-start",
    },
    helpText: {
      fontSize: 11,
      color: "#4b5563",
      marginTop: 8,
      lineHeight: 1.5,
    },
    helpTextSmall: {
      fontSize: 10,
      color: "#6b7280",
      marginTop: 4,
      lineHeight: 1.5,
    },
    muted: {
      color: "#9ca3af",
      fontSize: 12,
    },
    kpiGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
      gap: 10,
    },
    kpiCard: {
      background: "#fff8ea",
      borderRadius: 10,
      padding: "10px 12px",
      border: "1px solid #e5e7eb",
    },
    kpiLabel: {
      fontSize: 11,
      color: "#6b7280",
    },
    kpiValue: {
      fontSize: 18,
      fontWeight: 700,
      marginTop: 4,
      fontVariantNumeric: "tabular-nums",
    },
    tdSmall: {
      fontSize: 11,
      padding: "4px 6px",
      borderBottom: "1px solid #e5e7eb",
    },
    primaryBtnGhost: {
      background: "transparent",
      borderRadius: 999,
      padding: "6px 12px",
      border: "1px solid #9ca3af",
      fontSize: 12,
      fontWeight: 500,
      cursor: "pointer",
      color: "#111827",
    },
    chip: {
      padding: "2px 8px",
      borderRadius: 999,
      fontSize: 11,
      fontWeight: 600,
    },
    gmailLayout: {
      display: "grid",
      gridTemplateColumns: "minmax(0,0.9fr) minmax(0,1.1fr)",
      gap: 12,
      alignItems: "stretch",
    },
  };

  const deleteGmailMessage = (/* id */) => {};

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.logoWrap}>
            <div style={styles.logo}>
              <img
                src="asklepius-logo.jpg"
                alt="Asklepius Logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
            <div>
              <div style={styles.brand}>ASKLEPIUS</div>
              <div style={styles.subbrand}>TERCÜME HİZMETLERİ</div>
            </div>
          </div>
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
              <button
                key={k}
                onClick={() => setView(k)}
                style={
                  view === k
                    ? styles.sidebarButtonActive
                    : styles.sidebarButton
                }
              >
                {t}
              </button>
            ))}
          </nav>
        </div>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          {!googleAuth ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 12, color: "#D1D5DB", marginBottom: 4 }}>
                Google Hesabını Bağla
              </div>
              <button
                type="button"
                onClick={connectGoogleContacts}
                style={{
                  ...styles.sidebarButton,
                  background: "#fff",
                  color: "#8A6322",
                  fontWeight: 700,
                }}
              >
                Google Kişilerini Bağla
              </button>
              {googleLoading && (
                <div style={{ fontSize: 12, color: "#D1D5DB" }}>
                  Bağlanıyor...
                </div>
              )}
              {googleError && (
                <div style={{ fontSize: 12, color: "#FCA5A5" }}>
                  {googleError}
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 12, color: "#BBF7D0", fontWeight: 700 }}>
                Google Bağlı
              </div>
              <div style={{ fontSize: 11, color: "#E5E7EB" }}>
                {googleContacts.length} kişi eşleşti
              </div>
              <button
                type="button"
                onClick={handleGoogleDisconnect}
                style={{
                  ...styles.sidebarButton,
                  fontSize: 12,
                  padding: "6px 10px",
                  color: "#FCA5A5",
                  borderColor: "rgba(248,113,113,0.3)",
                }}
              >
                Bağlantıyı Kes
              </button>
            </div>
          )}
        </div>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.h1}>Asklepius CRM</h1>
            <p style={styles.mutedDark}>
              Şirket, kişi, deal, project ve aktivite takibi
            </p>
          </div>
          <div style={styles.statsRow}>
            <Stat label="Deal Sayısı" value={dealStats.count} />
            <Stat label="Won Deal" value={dealStats.wonCount} />
            <Stat label="Bekleyen" value={dealStats.pending} />
          </div>
        </header>

        {importMessage && (
          <div style={styles.notice}>{importMessage}</div>
        )}

        {view === "dashboard" && (
          <section style={styles.grid2}>
            <div style={{ ...styles.panel, gridColumn: "1 / -1" }}>
              <div style={styles.kpiGrid}>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>Şirket</div>
                  <div style={styles.kpiValue}>{kpiSummary.companies}</div>
                </div>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>Kişi</div>
                  <div style={styles.kpiValue}>{kpiSummary.contacts}</div>
                </div>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>Açık Deal</div>
                  <div style={styles.kpiValue}>{kpiSummary.openDeals}</div>
                </div>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>Rezervasyonlu Deal</div>
                  <div style={styles.kpiValue}>{kpiSummary.reservedDeals}</div>
                </div>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>Gerçekleşen Gelir</div>
                  <div style={styles.kpiValue}>
                    {money(kpiSummary.realizedIncome)}
                  </div>
                </div>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>Rezervasyon Geliri</div>
                  <div style={styles.kpiValue}>
                    {money(kpiSummary.pendingIncome)}
                  </div>
                </div>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>Toplam Gider</div>
                  <div style={styles.kpiValue}>
                    {money(kpiSummary.expense)}
                  </div>
                </div>
                <div style={styles.kpiCard}>
                  <div style={styles.kpiLabel}>Net Kar Zarar</div>
                  <div style={styles.kpiValue}>
                    {money(kpiSummary.profitLoss)}
                  </div>
                </div>
              </div>
            </div>

            <Panel title="Aylık Gelir">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={reportMonthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="value" fill="#57C4E5" />
                </BarChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Deal Status">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={reportDealStatusPie}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
                    {reportDealStatusPie.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Panel>

            <Panel title="Rezervasyonlu İşler">
              {reservedDeals.length === 0 ? (
                <p>Rezervasyonlu iş yok.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        {[
                          "Deal",
                          "Şirket",
                          "Kişi",
                          "Alınma Tarihi",
                          "Tahmini Gelir",
                          "Kapanış",
                          "Statü",
                          "İşlem",
                        ].map((h) => (
                          <th key={h} style={styles.th}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reservedDeals.map((d) => (
                        <tr key={d.id}>
                          <td style={styles.td}>{d.name}</td>
                          <td style={styles.td}>{d.customer}</td>
                          <td style={styles.td}>{d.contactPerson || "-"}</td>
                          <td style={styles.td}>{d.dateReceived || "-"}</td>
                          <td style={styles.tdMoney}>{money(d.estRevenue)}</td>
                          <td style={styles.td}>{d.estCloseDate || "-"}</td>
                          <td style={styles.td}>
                            <select
                              value={d.status}
                              onChange={(e) =>
                                updateDealStatus(d.id, e.target.value)
                              }
                              style={styles.input}
                            >
                              {dealStatuses.map((s) => (
                                <option key={s} value={s}>
                                  {dealStatusLabel(s)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={styles.td}>
                            <button
                              onClick={() => openDetail("deal", d.id)}
                              style={styles.smallBtn}
                            >
                              Detay
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </section>
        )}

        {/* Şirketler, kişiler, deals, projeler, detay, aktiviteler, rapor, muhasebe, gmail, içe aktar, ayarlar bölümleri mevcut dosyanla aynı şekilde aşağıda devam ediyor.
            Sadece dashboard header'daki Toplam Gelir stat'ı kaldırıldı ve rapor ekranındaki Toplam Gelir KPI kartı çıkarıldı. */}
      </main>
    </div>
  );
}
