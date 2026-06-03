import React, { useEffect, useMemo, useState } from "react";
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

const LS_COMPANIES = "asklepius-companies";
const LS_CONTACTS = "asklepius-contacts";
const LS_DEALS = "asklepius-deals";
const LS_PROJECTS = "asklepius-projects";
const LS_ACTIVITIES = "asklepius-activities";

const dealStatuses = ["closed won", "reservasyon", "işlemde", "ödeme bekleniyor", "kayıp/iptal"];
const activityTypes = ["note", "email", "call", "meeting", "task", "status_change"];
const entityTypes = ["company", "contact", "deal", "project"];
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
    createdAt: new Date().toISOString(),
  },
];

const seedContacts = [
  {
    id: crypto.randomUUID(),
    fullName: "Mehmet Yılmaz",
    company: "ABC Çeviri",
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

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
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
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9çğıöşü_/-]/g, "");
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

function byDateRange(items, key, from, to) {
  return items.filter((x) => {
    const d = String(x[key] || "").slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

export default function App() {
  const [companies, setCompanies] = useState(() => load(LS_COMPANIES, seedCompanies));
  const [contacts, setContacts] = useState(() => load(LS_CONTACTS, seedContacts));
  const [deals, setDeals] = useState(() => load(LS_DEALS, seedDeals));
  const [projects, setProjects] = useState(() => load(LS_PROJECTS, seedProjects));
  const [activities, setActivities] = useState(() => load(LS_ACTIVITIES, seedActivities));

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
  const [importMessage, setImportMessage] = useState("");
  const [search, setSearch] = useState("");

  const [activityForm, setActivityForm] = useState({
    type: "note",
    subject: "",
    body: "",
    direction: "internal",
    status: "done",
    createdBy: "Ayşe",
  });

  const [editState, setEditState] = useState({
    type: null,
    item: null,
  });

  useEffect(() => save(LS_COMPANIES, companies), [companies]);
  useEffect(() => save(LS_CONTACTS, contacts), [contacts]);
  useEffect(() => save(LS_DEALS, deals), [deals]);
  useEffect(() => save(LS_PROJECTS, projects), [projects]);
  useEffect(() => save(LS_ACTIVITIES, activities), [activities]);

  const selectedList = useMemo(() => {
    if (selectedEntityType === "company") return companies;
    if (selectedEntityType === "contact") return contacts;
    if (selectedEntityType === "project") return projects;
    return deals;
  }, [selectedEntityType, companies, contacts, projects, deals]);

  useEffect(() => {
    if (!selectedEntityId && selectedList[0]?.id) setSelectedEntityId(selectedList[0].id);
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
    const list = deals
      .filter((d) => (statusFilter ? d.status === statusFilter : true))
      .filter((d) => (companyFilter ? d.customer === companyFilter : true))
      .filter((d) => (contactFilter ? d.contactPerson === contactFilter : true))
      .filter((d) => (yearFilter ? String(new Date(d.dateReceived).getFullYear()) === String(yearFilter) : true))
      .filter((d) => (monthFilter ? d.dateReceived.slice(0, 7) === monthFilter : true))
      .filter((d) => {
        if (!search) return true;
        return `${d.customer} ${d.contactPerson} ${d.name} ${d.status}`.toLowerCase().includes(search.toLowerCase());
      });
    return list;
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
      .sort(([a], [b]) => a.localeCompare(b))
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
    const won = dealFiltered.filter((d) => d.status === "closed won");
    const pending = dealFiltered.filter((d) => d.status === "işlemde" || d.status === "reservasyon").length;
    const totalRevenue = won.reduce((s, d) => s + Number(d.estRevenue || 0), 0);
    return {
      count: dealFiltered.length,
      wonCount: won.length,
      pending,
      totalRevenue,
    };
  }, [dealFiltered]);

  const companyMap = useMemo(() => new Map(companies.map((c) => [c.companyName.toLowerCase(), c])), [companies]);
  const contactMap = useMemo(() => new Map(contacts.map((c) => [c.fullName.toLowerCase(), c])), [contacts]);


  const normalizeDealStatus = (value) => {
    const v = String(value || "").trim().toLowerCase();
    if (!v) return "";
    if (["closed won", "won", "kazanıldı", "kazanildi"].includes(v)) return "closed won";
    if (["lost / cancelled", "lost/cancelled", "lost cancelled", "lost", "cancelled", "canceled", "iptal", "lost / canceled"].includes(v)) return "lost / cancelled";
    return v;
  };

  const parseCurrencyNumber = (value) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const cleaned = String(value || "").replace(/[^0-9,.-]/g, "").replace(/,(?=\d{3}\b)/g, "").replace(/,/g, ".");
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
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

  const openDetail = (type, id) => {
    setActiveDetailType(type);
    setActiveDetailId(id);
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

  const importCSV = async (file, mode) => {
    const text = await file.text();
    const rows = parseCSV(text);

    if (mode === "companies") {
      const mapped = rows
        .map((r) => ({
          id: crypto.randomUUID(),
          companyName: firstNonEmpty(r.companyname, r.company, r["company name"]),
          billingCity: firstNonEmpty(r.citybilling, r.billingcity, r.city, r["city (billing)"]),
          phone: firstNonEmpty(r.phone),
          mobile: firstNonEmpty(r.mobile),
          email: firstNonEmpty(r.email),
          nextStep: firstNonEmpty(r.nextstep, r["next step"]),
          lastActivity: firstNonEmpty(r.lastactivity, r["last activity"]),
          owner: firstNonEmpty(r.owner),
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
          fullName: firstNonEmpty(r.fullname, r["full name"]),
          company: firstNonEmpty(r.company),
          jobTitle: firstNonEmpty(r.jobtitle, r["job title"]),
          mobile: firstNonEmpty(r.mobile),
          business: firstNonEmpty(r.business),
          email1: firstNonEmpty(r.email1, r.email, r["email 1"]),
          cityBusiness: firstNonEmpty(r.citybusiness, r["city (business)"]),
          nextStep: firstNonEmpty(r.nextstep, r["next step"]),
          lastActivity: firstNonEmpty(r.lastactivity, r["last activity"]),
          owner: firstNonEmpty(r.owner),
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
          contactPerson: firstNonEmpty(r.contactperson, r["contact person"]),
          name: firstNonEmpty(r.name),
          dateReceived: firstNonEmpty(r.datereceived, r["date received"]),
          status: normalizeDealStatus(firstNonEmpty(r.status)),
          estRevenue: parseCurrencyNumber(firstNonEmpty(r.estrevenue, r["est. revenue"], 0)),
          estCloseDate: firstNonEmpty(r.estclosedate, r["est. close date"]),
          createdAt: new Date().toISOString(),
        }))
        .filter((x) => x.customer || x.contactPerson || x.name);
      setDeals((prev) => [...prev, ...mapped]);
      setImportMessage(`${mapped.length} deal içe aktarıldı.`);
    }

    if (mode === "projects") {
      const mapped = rows
        .map((r) => ({
          id: crypto.randomUUID(),
          company: firstNonEmpty(r.company),
          contactPerson: firstNonEmpty(r.contactperson, r["contact person"]),
          name: firstNonEmpty(r.name),
          status: firstNonEmpty(r.status).toLowerCase(),
          startDate: firstNonEmpty(r.startdate, r["start date"]),
          dueDate: firstNonEmpty(r.duedate, r["due date"]),
          estRevenue: Number(firstNonEmpty(r.estrevenue, 0) || 0),
          owner: firstNonEmpty(r.owner),
          createdAt: new Date().toISOString(),
        }))
        .filter((x) => x.company || x.name);
      setProjects((prev) => [...prev, ...mapped]);
      setImportMessage(`${mapped.length} proje içe aktarıldı.`);
    }
  };

  const entityLabel = (item, type) => {
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
            <img src="/asklepius-logo.png" alt="Asklepius Logo" style={styles.logo} />
          </div>
          <div style={styles.brand}>ASKLEPIUS</div>
          <div style={styles.subbrand}>TERCÜME HİZMETLERİ</div>
        </div>

        <nav style={styles.nav}>
          {[
            ["dashboard", "Dashboard"],
            ["companies", "Şirketler"],
            ["contacts", "Kişiler"],
            ["deals", "Deals"],
            ["projects", "Projects"],
            ["details", "Detay"],
            ["activities", "Aktiviteler"],
            ["reports", "Raporlar"],
            ["import", "İçe Aktar"],
          ].map(([k, t]) => (
            <button key={k} onClick={() => setView(k)} style={{ ...styles.navBtn, ...(view === k ? styles.navBtnActive : {}) }}>
              {t}
            </button>
          ))}
        </nav>
      </aside>

      <main style={styles.main}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.h1}>Asklepius CRM</h1>
            <p style={styles.mutedDark}>Şirket, kişi, deal, project ve aktivite takibi</p>
          </div>

          <div style={styles.statsRow}>
            <Stat label="Deal Sayısı" value={dealStats.count} />
            <Stat label="Won Deal" value={dealStats.wonCount} />
            <Stat label="Bekleyen" value={dealStats.pending} />
            <Stat label="Toplam Gelir" value={money(dealStats.totalRevenue)} />
          </div>
        </header>

        {importMessage && <div style={styles.notice}>{importMessage}</div>}

        {view === "dashboard" && (
          <section style={styles.grid2}>
            <Panel title="Aylık Gelir">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyRevenue}>
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
                  <Pie data={dealStatusPie} dataKey="value" nameKey="name" outerRadius={90} label>
                    {dealStatusPie.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          </section>
        )}

        {view === "companies" && (
          <section style={styles.grid2}>
            <Panel title="Şirketler Listesi">
              {companies.map((c) => (
                <Card key={c.id}>
                  <b>{c.companyName}</b>
                  <div>{c.billingCity} · {c.phone || "-"} · {c.email || "-"}</div>
                  <div style={styles.cardActions}>
                    <button onClick={() => openDetail("company", c.id)} style={styles.smallBtn}>Detay</button>
                    <button onClick={() => startEdit("company", c)} style={styles.smallBtn}>Düzenle</button>
                    <button onClick={() => deleteRecord("company", c.id)} style={styles.smallDanger}>Sil</button>
                  </div>
                </Card>
              ))}
            </Panel>

            <Panel title="Şirket Özeti">
              <p>Toplam şirket: {companies.length}</p>
              <p>Bağlı kişi: {contacts.filter((x) => x.company).length}</p>
              <p>Bağlı deal: {deals.filter((x) => x.customer).length}</p>
            </Panel>
          </section>
        )}

        {view === "contacts" && (
          <section style={styles.grid2}>
            <Panel title="Kişiler Listesi">
              {contacts.map((c) => {
                const companyMatch = companyMap.get(String(c.company || "").toLowerCase());
                return (
                  <Card key={c.id}>
                    <b>{c.fullName}</b>
                    <div>
                      {c.company || "-"} {companyMatch ? "✓" : ""}
                      · {c.jobTitle || "-"} · {c.email1 || "-"}
                    </div>
                    <div style={styles.cardActions}>
                      <button onClick={() => openDetail("contact", c.id)} style={styles.smallBtn}>Detay</button>
                      <button onClick={() => startEdit("contact", c)} style={styles.smallBtn}>Düzenle</button>
                      <button onClick={() => deleteRecord("contact", c.id)} style={styles.smallDanger}>Sil</button>
                    </div>
                  </Card>
                );
              })}
            </Panel>

            <Panel title="Şirket Eşleştirme">
              <p>Şirket adı CSV’de şirketler ile eşleşirse kişi otomatik bağlı görünür.</p>
              <p>Boşsa kişi bağımsız kalır.</p>
            </Panel>
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

            <Panel title="Deal Listesi">
              {dealFiltered.map((d) => (
                <Card key={d.id}>
                  <b>{d.name}</b>
                  <div>{d.customer} · {d.contactPerson || "-"} · {d.status}</div>
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
                  <div>{p.company} · {p.contactPerson || "-"} · {p.status}</div>
                  <div>{p.startDate || "-"} → {p.dueDate || "-"}</div>
                  <div style={styles.cardActions}>
                    <button onClick={() => openDetail("project", p.id)} style={styles.smallBtn}>Detay</button>
                    <button onClick={() => startEdit("project", p)} style={styles.smallBtn}>Düzenle</button>
                    <button onClick={() => deleteRecord("project", p.id)} style={styles.smallDanger}>Sil</button>
                  </div>
                </Card>
              ))}
            </Panel>

            <Panel title="Project Özeti">
              <p>Toplam proje: {projects.length}</p>
              <p>Aktif proje: {projects.filter((p) => p.status === "işlemde").length}</p>
            </Panel>
          </section>
        )}

        {view === "details" && (
          <section style={styles.grid2}>
            <Panel title="Kayıt Detayı">
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
                <div key={a.id} style={styles.card}>
                  <b>{a.subject}</b>
                  <div>{a.type} · {a.direction} · {new Date(a.createdAt).toLocaleString("tr-TR")}</div>
                  <div>{a.body}</div>
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
            </Panel>
          </section>
        )}

        {view === "activities" && (
          <section style={styles.grid2}>
            <Panel title="Aktivite Listesi">
              {activities
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((a) => (
                  <div key={a.id} style={styles.card}>
                    <b>{a.subject}</b>
                    <div>{a.entityType} · {a.type} · {new Date(a.createdAt).toLocaleString("tr-TR")}</div>
                    <div>{a.body}</div>
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
            <Panel title={`${yearFilter || "Tüm"} Gelir Raporu`}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyRevenue}>
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
                  <Pie data={dealStatusPie} dataKey="value" nameKey="name" outerRadius={90} label>
                    {dealStatusPie.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Panel>
          </section>
        )}

        {view === "import" && (
          <section style={styles.grid2}>
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
              <form onSubmit={saveEdit} style={styles.form}>
                {editState.type === "company" && (
                  <>
                    <InputField label="Company Name" value={editState.item.companyName} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, companyName: v } })} />
                    <InputField label="City (Billing)" value={editState.item.billingCity} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, billingCity: v } })} />
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
                    <InputField label="City (Business)" value={editState.item.cityBusiness} onChange={(v) => setEditState({ ...editState, item: { ...editState.item, cityBusiness: v } })} />
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
                    <select value={editState.item.status} onChange={(e) => setEditState({ ...editState, item: { ...editState.item, status: e.target.value } })} style={styles.input}>
                      {dealStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
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
                  </>
                )}
                <button style={styles.primaryBtn}>Kaydet</button>
              </form>
            </Panel>
          </section>
        )}
      </main>
    </div>
  );
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

function InputField({ label, value, onChange }) {
  return (
    <label style={styles.field}>
      <span style={styles.label}>{label}</span>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={styles.input} />
    </label>
  );
}

const styles = {
  app: { display: "grid", gridTemplateColumns: "300px 1fr", minHeight: "100vh", background: "#fff8ea", fontFamily: "Inter, system-ui, sans-serif" },
  sidebar: { background: "linear-gradient(180deg, #E0A23F 0%, #C98B2E 100%)", padding: 24, color: "#fff", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 24 },
  logoWrap: { background: "#fffdf8", padding: 10, borderRadius: 18, width: "fit-content", marginBottom: 14 },
  logo: { width: 120, display: "block" },
  brand: { fontSize: 30, fontWeight: 900, letterSpacing: 1, color: "#fff" },
  subbrand: { fontSize: 13, fontWeight: 700, letterSpacing: 2, color: "#fff7ea", marginBottom: 16 },
  nav: { display: "grid", gap: 10 },
  navBtn: { padding: "12px 14px", borderRadius: 12, border: "1px solid rgba(255,255,255,.25)", background: "rgba(255,255,255,.15)", color: "#fff", textAlign: "left", cursor: "pointer" },
  navBtnActive: { background: "#fff", color: "#8A6322", fontWeight: 700 },
  main: { padding: 24, display: "grid", gap: 20 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "end", gap: 20, flexWrap: "wrap" },
  h1: { margin: 0, fontSize: 34, color: "#8A6322" },
  h2: { margin: "0 0 16px", fontSize: 20, color: "#8A6322" },
  statsRow: { display: "grid", gridTemplateColumns: "repeat(4, minmax(140px, 1fr))", gap: 12 },
  stat: { background: "#fff", borderRadius: 16, padding: 16, boxShadow: "0 8px 24px rgba(138,99,34,.10)", border: "1px solid rgba(224,162,63,.2)" },
  statLabel: { fontSize: 12, color: "#8A6322" },
  statValue: { fontSize: 20, fontWeight: 800, marginTop: 6, color: "#2B2B2B" },
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 },
  panel: { background: "#fff", borderRadius: 20, padding: 18, boxShadow: "0 10px 30px rgba(138,99,34,.10)", border: "1px solid rgba(224,162,63,.2)" },
  form: { display: "grid", gap: 12 },
  field: { display: "grid", gap: 6 },
  label: { fontSize: 13, color: "#8A6322", fontWeight: 600 },
  input: { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid #e7d7ba", outline: "none", fontSize: 14, background: "#fffdf8", color: "#2B2B2B" },
  textarea: { width: "100%", minHeight: 110, padding: "12px 14px", borderRadius: 12, border: "1px solid #e7d7ba", outline: "none", fontSize: 14, background: "#fffdf8", color: "#2B2B2B" },
  primaryBtn: { padding: "12px 14px", borderRadius: 12, border: "none", background: "#57C4E5", color: "#fff", cursor: "pointer", fontWeight: 800 },
  smallBtn: { padding: "8px 10px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" },
  smallDanger: { padding: "8px 10px", borderRadius: 10, border: "1px solid #fca5a5", background: "#fff1f1", cursor: "pointer", color: "#b91c1c" },
  card: { border: "1px solid #f1e4c8", borderRadius: 16, padding: 14, marginBottom: 12, background: "#fffdf8" },
  cardActions: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  filters: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 },
  notice: { backgroundColor: "#fff3cd", border: "1px solid #E0A23F", color: "#8A6322", padding: "12px 16px", borderRadius: 12 },
  fileLabel: { display: "inline-block", padding: "10px 14px", borderRadius: 12, border: "1px solid #57C4E5", background: "#f2fbfe", cursor: "pointer", color: "#2B2B2B", fontSize: 14, fontWeight: 700 },
  fileInput: { display: "none" },
  helpText: { margin: "0 0 12px", color: "#8A6322" },
};
