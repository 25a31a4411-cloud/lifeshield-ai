import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  Activity, ArrowDownRight, ArrowRight, Bell, BookOpen,
  BriefcaseBusiness, Calculator, CalendarClock, Check,
  CheckCircle2, ChevronDown, ChevronRight, CircleHelp,
  ClipboardCheck, FileText, HeartHandshake, Home, IndianRupee,
  Lightbulb, LogOut, Menu, MessageCircle, Plus, Search,
  Settings, Shield, ShieldAlert, ShieldCheck, Sparkles,
  TrendingUp, Users, Wallet, X, Landmark, RotateCcw,
  ExternalLink, LockKeyhole, Send, Bot, Scale, ChartNoAxesCombined,
  RefreshCw, Trash2, Eye, EyeOff, GraduationCap, Stethoscope,
  Baby, House, Car, PiggyBank, BadgeCheck, AlertTriangle,
} from "lucide-react";
import "./App.css";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

const INITIAL_PROFILE = {
  age: 32,
  annual_income: 1200000,
  annual_expenses: 480000,
  monthly_budget: 18000,
  dependents: 3,
  years: 20,
  loans: 2500000,
  future_goals: 1500000,
  existing_assets: 500000,
  existing_cover: 1000000,
  inflation: 6,
  discount_rate: 6,
};

const NAV_GROUPS = [
  {
    title: "YOUR FINANCES",
    items: [
      ["Overview", Home],
      ["My Assessment", Calculator],
      ["My Coverage", ShieldCheck],
      ["Life-Event Simulator", TrendingUp],
      ["Affordability Optimizer", Wallet],
    ],
  },
  {
    title: "FIND THE RIGHT COVER",
    items: [
      ["Recommendations", Sparkles],
      ["Compare Products", Scale],
      ["Policy Finder", Search],
      ["Application Journey", ClipboardCheck],
    ],
  },
  {
    title: "PROTECT YOURSELF",
    items: [
      ["Fraud & Scam Checker", ShieldAlert],
      ["AI Assistant", MessageCircle],
      ["Government Schemes", Landmark],
      ["My Policies", FileText],
      ["Premium Reminders", Bell],
    ],
  },
  {
    title: "SUPPORT",
    items: [
      ["Talk to an Advisor", HeartHandshake],
      ["Reports", ChartNoAxesCombined],
      ["Company Insights", BriefcaseBusiness],
      ["Settings", Settings],
    ],
  },
];

const DEMO_PRODUCTS = [
  {
    id: "term-demo",
    name: "Term life protection",
    insurer: "Illustrative catalogue",
    type: "Term life",
    source: "DEMO DATA",
    verified: false,
    description:
      "Protection-focused concept. Check policy term, exclusions, claim requirements, and official policy wording.",
  },
  {
    id: "savings-demo",
    name: "Savings-linked life plan",
    insurer: "Illustrative catalogue",
    type: "Savings + life cover",
    source: "DEMO DATA",
    verified: false,
    description:
      "Illustrative savings concept. Compare charges, guaranteed and non-guaranteed benefits, liquidity, and surrender terms.",
  },
  {
    id: "review-demo",
    name: "Family protection review",
    insurer: "Illustrative catalogue",
    type: "Needs review",
    source: "DEMO DATA",
    verified: false,
    description:
      "Placeholder for an authorized product feed. This is not a real offer or premium quote.",
  },
];

const MONEY = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const NUMBER = (value) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const CRORE = (value) => {
  const number = Number(value) || 0;
  if (number >= 10000000) return `₹${(number / 10000000).toFixed(2)} Cr`;
  if (number >= 100000) return `₹${(number / 100000).toFixed(2)} L`;
  return MONEY(number);
};

function calculateLocally(profile) {
  const annualSurplus = Math.max(
    0,
    Number(profile.annual_income) - Number(profile.annual_expenses)
  );

  const years = Math.max(1, Number(profile.years) || 1);
  const rate = Math.max(0, Number(profile.discount_rate) || 0) / 100;

  const incomeReplacement =
    rate === 0
      ? annualSurplus * years
      : annualSurplus * (1 - (1 + rate) ** -years) / rate;

  const futureGoals =
    Math.max(0, Number(profile.future_goals) || 0) *
    (1 + Math.max(0, Number(profile.inflation) || 0) / 100) **
      years;

  const needsBeforeAssets =
    incomeReplacement +
    Math.max(0, Number(profile.loans) || 0) +
    futureGoals;

  const totalNeeds = Math.max(
    0,
    needsBeforeAssets - Math.max(0, Number(profile.existing_assets) || 0)
  );

  const existingCover = Math.max(
    0,
    Number(profile.existing_cover) || 0
  );

  return {
    income_replacement: incomeReplacement,
    loans_and_liabilities: Number(profile.loans) || 0,
    future_goals_adjusted: futureGoals,
    assets_deducted: Number(profile.existing_assets) || 0,
    total_needs: totalNeeds,
    existing_cover: existingCover,
    coverage_gap: Math.max(0, totalNeeds - existingCover),
    annual_surplus: annualSurplus,
    method:
      "Present-value income surplus + inflation-adjusted goals + liabilities - liquid assets - existing life cover",
    disclaimer:
      "Illustrative educational estimate only. Not regulated financial advice.",
  };
}

function initialPage() {
  return "Overview";
}

function getSaved(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(Boolean(supabase));
  const [authMode, setAuthMode] = useState("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");

  const [page, setPage] = useState(initialPage);
  const [mobileNav, setMobileNav] = useState(false);
  const [profile, setProfile] = useState(() =>
    getSaved("lifeshield_profile", INITIAL_PROFILE)
  );
  const [backendResult, setBackendResult] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const [apiStatus, setApiStatus] = useState("checking");
  const [apiHealth, setApiHealth] = useState(null);

  const [products, setProducts] = useState(DEMO_PRODUCTS);
  const [policies, setPolicies] = useState(() =>
    getSaved("lifeshield_policies", [])
  );
  const [reminders, setReminders] = useState(() =>
    getSaved("lifeshield_reminders", [])
  );
  const [advisorRequests, setAdvisorRequests] = useState(() =>
    getSaved("lifeshield_advisor_requests", [])
  );
  const [fraudText, setFraudText] = useState("");
  const [fraudResult, setFraudResult] = useState(null);
  const [fraudLoading, setFraudLoading] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text:
        "Hi! I'm LifeShield AI. Ask me about life insurance, coverage gaps, exclusions, affordability, or how to compare policies. I provide educational information, not a binding recommendation.",
    },
  ]);
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [scenario, setScenario] = useState({
    inflation: 6,
    years: 20,
    futureCost: 1500000,
  });
  const [policyForm, setPolicyForm] = useState({
    insurer: "",
    policy_name: "",
    policy_number: "",
    sum_assured: "1000000",
    premium: "12000",
    renewal_date: "",
  });
  const [reminderForm, setReminderForm] = useState({
    title: "Life insurance premium renewal",
    due_date: "",
  });
  const [advisorForm, setAdvisorForm] = useState({
    preferred_date: "",
    topic: "Coverage review",
    notes: "",
  });

  const isAuthenticated = Boolean(session?.user);
  const user = session?.user || null;
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Customer";

  const result = useMemo(
    () => calculateLocally(profile),
    [profile]
  );

  const displayedResult = backendResult || result;
  const completion = useMemo(() => {
    const checks = [
      Number(profile.age) >= 18,
      Number(profile.annual_income) > 0,
      Number(profile.annual_expenses) >= 0,
      Number(profile.dependents) >= 0,
      Number(profile.years) > 0,
      Number(profile.existing_cover) >= 0,
      Number(profile.loans) >= 0,
    ];
    return Math.round(
      (checks.filter(Boolean).length / checks.length) * 100
    );
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("lifeshield_profile", JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem("lifeshield_policies", JSON.stringify(policies));
  }, [policies]);

  useEffect(() => {
    localStorage.setItem("lifeshield_reminders", JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    localStorage.setItem(
      "lifeshield_advisor_requests",
      JSON.stringify(advisorRequests)
    );
  }, [advisorRequests]);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return undefined;
    }

    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then(async (response) => {
        if (!response.ok) throw new Error("API unavailable");
        return response.json();
      })
      .then((data) => {
        setApiHealth(data);
        setApiStatus("online");
      })
      .catch(() => {
        setApiHealth(null);
        setApiStatus("offline");
      });
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch(`${API_URL}/api/products`);
        if (!response.ok) return;
        const data = await response.json();
        if (active && Array.isArray(data.items)) {
          setProducts(data.items);
        }
      } catch {
        // Demo catalogue remains available offline.
      }
    }

    loadProducts();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function apiRequest(path, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`;
    }

    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    let data = {};
    try {
      data = await response.json();
    } catch {
      // Non-JSON error response.
    }

    if (!response.ok) {
      throw new Error(
        data.detail ||
          data.message ||
          `Request failed with status ${response.status}`
      );
    }

    return data;
  }

  async function handleGoogleLogin() {
    setAuthError("");
    setAuthNotice("");
    if (!supabase) {
      setAuthError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env, then restart Vite.");
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      setAuthError(error.message || "Google sign-in could not be started.");
    }
  }

  async function handleAuth(event) {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");

    if (!supabase) {
      setAuthError(
        "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env, then restart Vite."
      );
      return;
    }

    if (!authEmail.trim() || !authPassword) {
      setAuthError("Enter your email address and password.");
      return;
    }

    try {
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: { full_name: authName.trim() },
          },
        });

        if (error) throw error;

        if (data.session) {
          setSession(data.session);
          setAuthNotice("Your account has been created.");
        } else {
          setAuthNotice(
            "Account created. Check your email to confirm your address, then sign in."
          );
          setAuthMode("signin");
        }
      } else {
        const { data, error } =
          await supabase.auth.signInWithPassword({
            email: authEmail.trim(),
            password: authPassword,
          });

        if (error) throw error;
        setSession(data.session);
        setToast("Signed in successfully.");
      }
    } catch (error) {
      setAuthError(error.message || "Authentication failed.");
    }
  }

  async function handleSignOut() {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) {
        setToast(error.message);
        return;
      }
    }

    setSession(null);
    setPage("Overview");
    setToast("Signed out.");
  }

  function updateProfile(key, value) {
    setProfile((current) => ({
      ...current,
      [key]: value,
    }));
    setBackendResult(null);
  }

  async function calculateWithBackend() {
    setApiLoading(true);
    setApiError("");

    try {
      const data = await apiRequest("/api/calculate-needs", {
        method: "POST",
        body: JSON.stringify(profile),
      });
      setBackendResult(data);
      setToast("Assessment calculated successfully.");
    } catch (error) {
      setApiError(
        `${error.message}. Showing the local estimate until the API is available.`
      );
    } finally {
      setApiLoading(false);
    }
  }

  async function refreshAssessment() {
    setApiError("");

    try {
      const data = await apiRequest("/api/assessment");
      if (data.profile) setProfile(data.profile);
      if (data.result) setBackendResult(data.result);
      setToast("Saved assessment loaded.");
    } catch (error) {
      setApiError(error.message);
    }
  }

  async function runFraudCheck(event) {
    event.preventDefault();
    if (fraudText.trim().length < 5) {
      setToast("Paste a message with at least five characters.");
      return;
    }

    setFraudLoading(true);
    setFraudResult(null);

    try {
      const data = await apiRequest("/api/fraud-check", {
        method: "POST",
        body: JSON.stringify({ text: fraudText }),
      });
      setFraudResult(data);
    } catch (error) {
      const text = fraudText.toLowerCase();
      const checks = [
        ["Urgent payment or threat", /urgent|immediately|last chance|cancelled|within 24 hours/],
        ["OTP or password request", /\botp\b|password|pin number|verification code/],
        ["Unrealistic return claim", /double your money|guaranteed 30%|risk free high return/],
        ["Suspicious payment or link", /personal account|bit\.ly|tinyurl|pay agent|upi to/],
      ];
      const signals = checks
        .filter(([, pattern]) => pattern.test(text))
        .map(([label]) => label);

      setFraudResult({
        risk_level: signals.length >= 2 ? "high" : signals.length ? "medium" : "low",
        summary:
          "Offline keyword screening only. This result cannot establish whether a message is genuine.",
        signals,
        next_steps:
          "Verify through the insurer's official website or a contact number obtained independently. Never share OTPs, PINs or passwords.",
        fallback: true,
      });
      setApiError(`Using local screening because the API was unavailable: ${error.message}`);
    } finally {
      setFraudLoading(false);
    }
  }

  async function sendChat(event) {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message || chatLoading) return;

    const updated = [...messages, { role: "user", text: message }];
    setMessages(updated);
    setChatInput("");
    setChatLoading(true);

    try {
      const data = await apiRequest("/api/assistant", {
        method: "POST",
        body: JSON.stringify({
          message,
          context: {
            coverage_gap: displayedResult.coverage_gap,
            total_needs: displayedResult.total_needs,
            existing_cover: profile.existing_cover,
            monthly_budget: profile.monthly_budget,
          },
        }),
      });

      setMessages((current) => [
        ...current,
        { role: "assistant", text: data.answer },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: localAssistantAnswer(message, displayedResult, profile),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  async function addPolicy(event) {
    event.preventDefault();

    const item = {
      ...policyForm,
      sum_assured: Number(policyForm.sum_assured) || 0,
      premium: Number(policyForm.premium) || 0,
    };

    if (!item.insurer.trim() || !item.policy_name.trim()) {
      setToast("Enter the insurer and policy name.");
      return;
    }

    try {
      const data = await apiRequest("/api/policies", {
        method: "POST",
        body: JSON.stringify(item),
      });

      setPolicies((current) => [
        { ...data.item, ...item },
        ...current,
      ]);
      setToast("Policy saved.");
    } catch {
      setPolicies((current) => [
        {
          ...item,
          id: crypto.randomUUID(),
          localOnly: true,
          created_at: new Date().toISOString(),
        },
        ...current,
      ]);
      setToast("Policy saved locally on this device.");
    }

    setPolicyForm({
      insurer: "",
      policy_name: "",
      policy_number: "",
      sum_assured: "1000000",
      premium: "12000",
      renewal_date: "",
    });
  }

  async function deletePolicy(policy) {
    if (!window.confirm(`Delete "${policy.policy_name}"?`)) return;

    if (!policy.localOnly && policy.id) {
      try {
        await apiRequest(`/api/policies/${policy.id}`, {
          method: "DELETE",
        });
      } catch {
        setToast("Server delete failed; removed from this device only.");
      }
    }

    setPolicies((current) =>
      current.filter((item) => item.id !== policy.id)
    );
  }

  async function addReminder(event) {
    event.preventDefault();
    if (!reminderForm.title.trim()) return;

    const item = {
      title: reminderForm.title.trim(),
      due_date: reminderForm.due_date || null,
    };

    try {
      const data = await apiRequest("/api/reminders", {
        method: "POST",
        body: JSON.stringify(item),
      });
      setReminders((current) => [
        data.item || data,
        ...current,
      ]);
      setToast("Reminder saved.");
    } catch {
      setReminders((current) => [
        { ...item, id: crypto.randomUUID(), localOnly: true },
        ...current,
      ]);
      setToast("Reminder saved locally.");
    }
  }

  async function submitAdvisorRequest(event) {
    event.preventDefault();

    const item = { ...advisorForm };

    try {
      const data = await apiRequest("/api/advisor-requests", {
        method: "POST",
        body: JSON.stringify(item),
      });
      setAdvisorRequests((current) => [
        data.item || item,
        ...current,
      ]);
      setToast(
        "Request recorded. This is not a confirmed booking."
      );
    } catch {
      setAdvisorRequests((current) => [
        { ...item, id: crypto.randomUUID(), localOnly: true },
        ...current,
      ]);
      setToast("Request saved locally; no booking was confirmed.");
    }

    setAdvisorForm({
      preferred_date: "",
      topic: "Coverage review",
      notes: "",
    });
  }

  function exportReport() {
    const report = {
      generated_at: new Date().toISOString(),
      profile,
      calculation: displayedResult,
      policies,
      reminders,
      disclaimer:
        "Educational estimate only. Not a policy quote or regulated financial advice.",
    };

    const blob = new Blob(
      [JSON.stringify(report, null, 2)],
      { type: "application/json" }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "lifeshield-assessment-report.json";
    link.click();
    URL.revokeObjectURL(url);
    setToast("Report exported.");
  }

  const scenarioCost =
    Math.max(0, Number(scenario.futureCost) || 0) *
    (1 + Math.max(0, Number(scenario.inflation) || 0) / 100) **
      Math.max(1, Number(scenario.years) || 1);

  const affordableAnnualPremium =
    Math.max(0, Number(profile.monthly_budget) || 0) * 12;

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.insurer} ${product.type}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  if (authLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo"><ShieldCheck size={30} /></div>
        <h2>LifeShield AI</h2>
        <p>Preparing your secure workspace…</p>
      </div>
    );
  }

  if (supabase && !session) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authName={authName}
        setAuthName={setAuthName}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        authError={authError}
        authNotice={authNotice}
        handleAuth={handleAuth}
        handleGoogleLogin={handleGoogleLogin}
      />
    );
  }

  function navigate(nextPage) {
    setPage(nextPage);
    setMobileNav(false);
    setApiError("");
  }

  return (
    <div className="app-shell">
      {mobileNav && (
        <button
          className="mobile-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobileNav(false)}
        />
      )}

      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={25} /></div>
          <div>
            <div className="brand-name">LifeShield <span>AI</span></div>
            <div className="brand-subtitle">INSURANCE CLARITY</div>
          </div>
          <button
            className="icon-button sidebar-close"
            onClick={() => setMobileNav(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="sidebar-profile">
          <div className="avatar">{userName.charAt(0).toUpperCase()}</div>
          <div className="profile-copy">
            <strong>{userName}</strong>
            <span>{user?.email || "Local demo workspace"}</span>
          </div>
          <span className={`status-dot ${apiStatus === "online" ? "online" : ""}`} />
        </div>

        <nav className="nav-groups">
          {NAV_GROUPS.map((group) => (
            <div className="nav-group" key={group.title}>
              <div className="nav-group-title">{group.title}</div>
              {group.items.map(([label, Icon]) => (
                <button
                  key={label}
                  className={`nav-item ${page === label ? "active" : ""}`}
                  onClick={() => navigate(label)}
                >
                  <Icon size={18} strokeWidth={1.8} />
                  <span>{label}</span>
                  {page === label && <ChevronRight size={15} className="nav-arrow" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="security-note">
            <LockKeyhole size={17} />
            <div>
              <strong>Your data matters</strong>
              <span>Review your privacy settings regularly.</span>
            </div>
          </div>
          <button className="nav-item signout-button" onClick={handleSignOut}>
            <LogOut size={18} />
            <span>{supabase ? "Sign out" : "Reset demo session"}</span>
          </button>
          <p className="sidebar-version">LifeShield AI · MVP</p>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              onClick={() => setMobileNav(true)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="breadcrumbs">
              <span>Workspace</span><ChevronRight size={14} /><strong>{page}</strong>
            </div>
          </div>
          <div className="topbar-actions">
            <span className={`api-pill ${apiStatus}`}>
              <span className="api-dot" />
              {apiStatus === "online" ? "API connected" : "Demo / offline"}
            </span>
            <button
              className="icon-button"
              onClick={() => navigate("Premium Reminders")}
              title="Premium reminders"
              aria-label="Premium reminders"
            >
              <Bell size={19} />
            </button>
            <button
              className="user-chip"
              onClick={() => navigate("Settings")}
              title="Open settings"
            >
              <span className="avatar small">{userName.charAt(0).toUpperCase()}</span>
              <span>{userName}</span>
              <ChevronDown size={15} />
            </button>
          </div>
        </header>

        <div className="page-content">
          {apiError && (
            <div className="inline-alert">
              <AlertTriangle size={17} />
              <span>{apiError}</span>
              <button onClick={() => setApiError("")} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}

          {page === "Overview" && (
            <OverviewPage
              profile={profile}
              result={displayedResult}
              completion={completion}
              policies={policies}
              reminders={reminders}
              apiHealth={apiHealth}
              navigate={navigate}
              calculateWithBackend={calculateWithBackend}
              apiLoading={apiLoading}
              exportReport={exportReport}
            />
          )}

          {page === "My Assessment" && (
            <AssessmentPage
              profile={profile}
              updateProfile={updateProfile}
              result={displayedResult}
              completion={completion}
              calculateWithBackend={calculateWithBackend}
              refreshAssessment={refreshAssessment}
              apiLoading={apiLoading}
            />
          )}

          {page === "My Coverage" && (
            <CoveragePage
              profile={profile}
              result={displayedResult}
              policies={policies}
              navigate={navigate}
            />
          )}

          {page === "Life-Event Simulator" && (
            <SimulatorPage
              scenario={scenario}
              setScenario={setScenario}
              scenarioCost={scenarioCost}
              profile={profile}
              result={displayedResult}
            />
          )}

          {page === "Affordability Optimizer" && (
            <AffordabilityPage
              profile={profile}
              updateProfile={updateProfile}
              result={displayedResult}
              affordableAnnualPremium={affordableAnnualPremium}
            />
          )}

          {page === "Recommendations" && (
            <RecommendationsPage
              profile={profile}
              result={displayedResult}
              navigate={navigate}
            />
          )}

          {page === "Compare Products" && (
            <ProductsPage
              products={filteredProducts}
              query={query}
              setQuery={setQuery}
              navigate={navigate}
            />
          )}

          {page === "Policy Finder" && (
            <PolicyFinderPage
              products={filteredProducts}
              query={query}
              setQuery={setQuery}
              navigate={navigate}
            />
          )}

          {page === "Application Journey" && (
            <ApplicationPage
              profile={profile}
              policies={policies}
              navigate={navigate}
            />
          )}

          {page === "Fraud & Scam Checker" && (
            <FraudPage
              fraudText={fraudText}
              setFraudText={setFraudText}
              fraudResult={fraudResult}
              fraudLoading={fraudLoading}
              runFraudCheck={runFraudCheck}
            />
          )}

          {page === "AI Assistant" && (
            <AssistantPage
              messages={messages}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendChat={sendChat}
              chatLoading={chatLoading}
              apiHealth={apiHealth}
            />
          )}

          {page === "Government Schemes" && <SchemesPage />}

          {page === "My Policies" && (
            <PoliciesPage
              policies={policies}
              policyForm={policyForm}
              setPolicyForm={setPolicyForm}
              addPolicy={addPolicy}
              deletePolicy={deletePolicy}
            />
          )}

          {page === "Premium Reminders" && (
            <RemindersPage
              reminders={reminders}
              reminderForm={reminderForm}
              setReminderForm={setReminderForm}
              addReminder={addReminder}
              setReminders={setReminders}
            />
          )}

          {page === "Talk to an Advisor" && (
            <AdvisorPage
              advisorForm={advisorForm}
              setAdvisorForm={setAdvisorForm}
              submitAdvisorRequest={submitAdvisorRequest}
              advisorRequests={advisorRequests}
            />
          )}

          {page === "Reports" && (
            <ReportsPage
              profile={profile}
              result={displayedResult}
              policies={policies}
              reminders={reminders}
              exportReport={exportReport}
            />
          )}

          {page === "Company Insights" && (
            <CompanyInsightsPage apiRequest={apiRequest} />
          )}

          {page === "Settings" && (
            <SettingsPage
              user={user}
              apiHealth={apiHealth}
              apiStatus={apiStatus}
              profile={profile}
              updateProfile={updateProfile}
              handleSignOut={handleSignOut}
              supabaseConfigured={Boolean(supabase)}
            />
          )}
        </div>

        <footer className="app-footer">
          <span>© {new Date().getFullYear()} LifeShield AI</span>
          <span><ShieldCheck size={14} /> Built for transparent insurance decisions</span>
          <span>Educational estimates only · Verify policy details officially</span>
        </footer>
      </main>

      {toast && (
        <div className="toast" role="status">
          <CheckCircle2 size={18} />
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="Dismiss">
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function localAssistantAnswer(message, result, profile) {
  const text = message.toLowerCase();

  if (text.includes("gap") || text.includes("cover")) {
    return `Your current illustrative coverage gap is ${MONEY(result.coverage_gap)}. This estimate uses income surplus, liabilities, inflation-adjusted goals, assets and existing cover. Review the assumptions before making a decision.`;
  }

  if (text.includes("term")) {
    return "Term life insurance is generally designed to provide life cover for a chosen period. Compare the policy term, sum assured, exclusions, premium-payment duration, claim conditions and renewal or conversion rules in the official policy wording.";
  }

  if (text.includes("inflation")) {
    return `Your current simulator uses ${profile.inflation}% inflation over ${profile.years} years. Inflation can significantly increase future goals. Change the assumptions in Life-Event Simulator to explore alternatives.`;
  }

  if (text.includes("premium") || text.includes("budget")) {
    return `Your entered monthly budget is ${MONEY(profile.monthly_budget)}. Affordability depends on actual insurer quotes, age, underwriting, coverage and policy terms. Do not treat sample data as a live quote.`;
  }

  return "I can explain life insurance concepts, coverage gaps, inflation, affordability and policy comparisons. The AI service is currently unavailable, so this is an offline fallback. Verify current product terms with official insurer sources.";
}

function AuthScreen(props) {
  const {
    authMode, setAuthMode, authEmail, setAuthEmail,
    authPassword, setAuthPassword, authName, setAuthName,
    showPassword, setShowPassword, authError, authNotice,
    handleAuth, handleGoogleLogin,
  } = props;

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <div className="auth-brand">
          <div className="brand-mark"><ShieldCheck size={27} /></div>
          <span>LifeShield <b>AI</b></span>
        </div>
        <div className="auth-hero">
          <span className="eyebrow light"><Sparkles size={15} /> FINANCIAL CLARITY, WITH AI</span>
          <h1>Protect what matters.<br /><span>Plan with confidence.</span></h1>
          <p>Understand your family's life insurance needs, uncover coverage gaps, and make more informed decisions.</p>
          <div className="auth-benefits">
            <div><CheckCircle2 size={19} /> Personalized needs assessment</div>
            <div><CheckCircle2 size={19} /> Transparent coverage breakdown</div>
            <div><CheckCircle2 size={19} /> AI-powered education and support</div>
          </div>
        </div>
        <div className="auth-visual-footer">Your information should remain yours. Always review privacy and security settings.</div>
      </div>

      <div className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-logo">
            <div className="brand-mark"><ShieldCheck size={24} /></div>
            <strong>LifeShield AI</strong>
          </div>
          <span className="eyebrow">WELCOME TO LIFESHIELD</span>
          <h2>{authMode === "signin" ? "Sign in to your account" : "Create your account"}</h2>
          <p className="muted">
            {authMode === "signin"
              ? "Continue your financial protection journey."
              : "Start building a clearer picture of your family's needs."}
          </p>

          <form className="auth-form" onSubmit={handleAuth}>
            {authMode === "signup" && (
              <Field label="Full name">
                <input
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>
            <Field label="Password">
              <div className="password-field">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete={authMode === "signin" ? "current-password" : "new-password"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </Field>

            {authError && <div className="form-error">{authError}</div>}
            {authNotice && <div className="form-success">{authNotice}</div>}

            <button className="btn-primary full-width" type="submit">
              {authMode === "signin" ? "Sign in securely" : "Create account"}
              <ArrowRight size={17} />
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0", color: "#64748b", fontSize: 12, fontWeight: 700 }}>
            <span style={{ height: 1, flex: 1, background: "#e2e8f0" }} />
            <span>OR CONTINUE WITH</span>
            <span style={{ height: 1, flex: 1, background: "#e2e8f0" }} />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="google-login-btn"
            style={{
              width: "100%", minHeight: 48, display: "flex", alignItems: "center",
              justifyContent: "center", gap: 12, padding: "12px 18px",
              background: "#fff", color: "#172033", border: "1px solid #cbd5e1",
              borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 3px 10px rgba(15,23,42,.06)", transition: "all .2s ease"
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#f4f8ff"; e.currentTarget.style.borderColor = "#4285f4"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#cbd5e1"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z"/>
              <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44z"/>
              <path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8z"/>
              <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6.1 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3c1.6-4.8 6.1-8.3 11.4-8.3z"/>
            </svg>
            Continue with Google
          </button>

          <div className="auth-switch">
            {authMode === "signin" ? "New to LifeShield AI?" : "Already have an account?"}
            <button
              style={{
                color: "#087f8c", background: "#e8fbf5", border: "1px solid #a7f3d0",
                borderRadius: 8, padding: "7px 12px", marginLeft: 6, fontWeight: 800,
                boxShadow: "0 3px 10px rgba(15,159,131,.12)", cursor: "pointer"
              }}
              onClick={() => {
                setAuthMode(authMode === "signin" ? "signup" : "signin");
                setAuthError("");
                setAuthNotice("");
              }}
            >
              {authMode === "signin" ? "Create account" : "Sign in"}
            </button>
          </div>

          <div className="auth-security">
            <LockKeyhole size={16} />
            <span>Authentication powered by your configured Supabase project.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PageTitle({ eyebrow, title, description, action }) {
  return (
    <div className="page-title-row">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action && <div className="page-title-action">{action}</div>}
    </div>
  );
}

function Panel({ title, subtitle, icon: Icon, children, action, className = "" }) {
  return (
    <section className={`panel ${className}`}>
      {(title || Icon || action) && (
        <div className="panel-head">
          <div className="panel-heading">
            {Icon && <div className="panel-icon"><Icon size={19} /></div>}
            <div>
              {title && <h3>{title}</h3>}
              {subtitle && <p>{subtitle}</p>}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function StatCard({ label, value, hint, icon: Icon, tone = "blue" }) {
  return (
    <div className={`stat-card stat-${tone}`}>
      <div className="stat-top">
        <span>{label}</span>
        <div className="stat-icon"><Icon size={19} /></div>
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

function ProgressBar({ value, tone = "blue" }) {
  return (
    <div className="progress-track">
      <div
        className={`progress-fill ${tone}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

function OverviewPage({
  profile, result, completion, policies, reminders,
  apiHealth, navigate, calculateWithBackend, apiLoading, exportReport,
}) {
  const coverPercent = result.total_needs > 0
    ? Math.min(100, (profile.existing_cover / result.total_needs) * 100)
    : 100;

  return (
    <>
      <PageTitle
        eyebrow="YOUR FINANCIAL SNAPSHOT"
        title={`Good to see you, ${" "}here's your protection overview.`}
        description="Understand where you stand today and take the next step toward informed coverage decisions."
        action={
          <button className="btn-primary" onClick={() => navigate("My Assessment")}>
            Review assessment <ArrowRight size={16} />
          </button>
        }
      />

      <div className="welcome-banner">
        <div className="welcome-content">
          <div className="welcome-label"><Sparkles size={15} /> YOUR NEXT STEP</div>
          <h2>Build a clearer picture of your family's protection needs.</h2>
          <p>Review your financial details, estimate your coverage gap, and explore realistic scenarios before comparing products.</p>
          <div className="welcome-actions">
            <button className="btn-white" onClick={() => navigate("My Assessment")}>
              Start assessment <ArrowRight size={16} />
            </button>
            <button className="btn-ghost-light" onClick={exportReport}>
              Export report <FileText size={16} />
            </button>
          </div>
        </div>
        <div className="welcome-art">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-shield"><ShieldCheck size={76} strokeWidth={1.25} /></div>
          <div className="art-float float-one"><Check size={15} /> Family first</div>
          <div className="art-float float-two"><Activity size={15} /> Plan ahead</div>
        </div>
      </div>

      <div className="stat-grid four">
        <StatCard
          label="Estimated total need"
          value={CRORE(result.total_needs)}
          hint="Illustrative financial estimate"
          icon={Calculator}
          tone="blue"
        />
        <StatCard
          label="Existing life cover"
          value={CRORE(profile.existing_cover)}
          hint="Based on your entered data"
          icon={ShieldCheck}
          tone="green"
        />
        <StatCard
          label="Estimated coverage gap"
          value={CRORE(result.coverage_gap)}
          hint="Review assumptions before acting"
          icon={ArrowDownRight}
          tone="orange"
        />
        <StatCard
          label="Assessment completion"
          value={`${completion}%`}
          hint="Based on required input fields"
          icon={ClipboardCheck}
          tone="purple"
        />
      </div>

      <div className="content-grid two-one">
        <Panel
          title="Your coverage at a glance"
          subtitle="A visual summary of the current estimate"
          icon={Shield}
          action={<button className="text-button" onClick={() => navigate("My Coverage")}>View breakdown <ArrowRight size={14} /></button>}
        >
          <div className="coverage-summary">
            <div className="coverage-ring-wrap">
              <div
                className="coverage-ring"
                style={{ "--ring-progress": `${coverPercent}%` }}
              >
                <div className="ring-inner">
                  <strong>{Math.round(coverPercent)}%</strong>
                  <span>of estimated need</span>
                </div>
              </div>
            </div>
            <div className="coverage-legend">
              <div className="legend-row">
                <span className="legend-dot green-dot" />
                <div><span>Existing cover</span><strong>{CRORE(profile.existing_cover)}</strong></div>
              </div>
              <div className="legend-row">
                <span className="legend-dot orange-dot" />
                <div><span>Estimated gap</span><strong>{CRORE(result.coverage_gap)}</strong></div>
              </div>
              <div className="legend-row">
                <span className="legend-dot blue-dot" />
                <div><span>Total estimated need</span><strong>{CRORE(result.total_needs)}</strong></div>
              </div>
            </div>
          </div>
          <div className="insight-strip">
            <Lightbulb size={18} />
            <span>Estimates depend on your inputs and assumptions. Actual coverage needs may differ.</span>
          </div>
        </Panel>

        <Panel
          title="Your action plan"
          subtitle="Suggested next steps"
          icon={ClipboardCheck}
        >
          <div className="action-list">
            <ActionItem
              number="01"
              title="Complete your assessment"
              description="Check income, liabilities, assets and future goals."
              onClick={() => navigate("My Assessment")}
              done={completion === 100}
            />
            <ActionItem
              number="02"
              title="Explore future scenarios"
              description="Test inflation and life-event assumptions."
              onClick={() => navigate("Life-Event Simulator")}
            />
            <ActionItem
              number="03"
              title="Compare policy features"
              description="Review policy terms, exclusions and affordability."
              onClick={() => navigate("Compare Products")}
            />
          </div>
        </Panel>
      </div>

      <div className="content-grid two">
        <Panel
          title="Financial profile"
          subtitle="Your current assessment inputs"
          icon={Wallet}
          action={<button className="text-button" onClick={() => navigate("My Assessment")}>Edit <ChevronRight size={15} /></button>}
        >
          <div className="profile-metrics">
            <Metric label="Annual income" value={MONEY(profile.annual_income)} />
            <Metric label="Annual expenses" value={MONEY(profile.annual_expenses)} />
            <Metric label="Outstanding liabilities" value={MONEY(profile.loans)} />
            <Metric label="Dependents" value={profile.dependents} />
            <Metric label="Planning horizon" value={`${profile.years} years`} />
            <Metric label="Monthly budget" value={MONEY(profile.monthly_budget)} />
          </div>
        </Panel>

        <Panel
          title="Your policy & reminder snapshot"
          subtitle="Items currently recorded in your workspace"
          icon={CalendarClock}
        >
          <div className="snapshot-list">
            <div className="snapshot-row">
              <div className="snapshot-icon green"><FileText size={18} /></div>
              <div><strong>{policies.length} policies</strong><span>Saved policy records</span></div>
              <button className="icon-button" onClick={() => navigate("My Policies")} aria-label="View policies"><ChevronRight size={18} /></button>
            </div>
            <div className="snapshot-row">
              <div className="snapshot-icon orange"><Bell size={18} /></div>
              <div><strong>{reminders.length} reminders</strong><span>Saved reminder records</span></div>
              <button className="icon-button" onClick={() => navigate("Premium Reminders")} aria-label="View reminders"><ChevronRight size={18} /></button>
            </div>
            <div className="snapshot-row">
              <div className="snapshot-icon purple"><Bot size={18} /></div>
              <div><strong>{apiHealth?.ai_configured ? "AI configured" : "AI setup pending"}</strong><span>{apiHealth?.ai_provider || "Configure backend AI provider"}</span></div>
              <span className="status-tag">{apiHealth?.ai_configured ? "Ready" : "Setup"}</span>
            </div>
          </div>
          <button className="btn-secondary full-width" onClick={calculateWithBackend} disabled={apiLoading}>
            <RefreshCw size={16} className={apiLoading ? "spin" : ""} />
            {apiLoading ? "Calculating…" : "Recalculate with backend"}
          </button>
        </Panel>
      </div>

      <Disclaimer />
    </>
  );
}

function ActionItem({ number, title, description, onClick, done }) {
  return (
    <button className="action-item" onClick={onClick}>
      <div className={`action-number ${done ? "done" : ""}`}>
        {done ? <Check size={16} /> : number}
      </div>
      <div className="action-copy"><strong>{title}</strong><span>{description}</span></div>
      <ChevronRight size={18} />
    </button>
  );
}

function Metric({ label, value }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function AssessmentPage({
  profile, updateProfile, result, completion,
  calculateWithBackend, refreshAssessment, apiLoading,
}) {
  return (
    <>
      <PageTitle
        eyebrow="PERSONALIZED NEEDS FINDER"
        title="My insurance assessment"
        description="Enter your financial details to estimate your life insurance needs. You can change the assumptions at any time."
        action={
          <button className="btn-secondary" onClick={refreshAssessment}>
            <RefreshCw size={16} /> Load saved assessment
          </button>
        }
      />

      <div className="assessment-layout">
        <div className="assessment-main">
          <Panel title="About you & your family" subtitle="Basic information used for planning" icon={Users}>
            <div className="form-grid three">
              <NumberField label="Your age" value={profile.age} min={18} max={100} onChange={(v) => updateProfile("age", v)} suffix="years" />
              <NumberField label="Financial dependents" value={profile.dependents} min={0} max={30} onChange={(v) => updateProfile("dependents", v)} />
              <NumberField label="Planning horizon" value={profile.years} min={1} max={60} onChange={(v) => updateProfile("years", v)} suffix="years" />
            </div>
          </Panel>

          <Panel title="Income & household expenses" subtitle="Use annual amounts in Indian rupees" icon={IndianRupee}>
            <div className="form-grid two">
              <NumberField label="Annual income" value={profile.annual_income} min={0} onChange={(v) => updateProfile("annual_income", v)} prefix="₹" />
              <NumberField label="Annual expenses" value={profile.annual_expenses} min={0} onChange={(v) => updateProfile("annual_expenses", v)} prefix="₹" />
              <NumberField label="Monthly insurance budget" value={profile.monthly_budget} min={0} onChange={(v) => updateProfile("monthly_budget", v)} prefix="₹" />
              <NumberField label="Outstanding loans & liabilities" value={profile.loans} min={0} onChange={(v) => updateProfile("loans", v)} prefix="₹" />
            </div>
            <div className="field-help">Use approximate figures if you do not know the exact amount. Do not enter account numbers or other secret credentials.</div>
          </Panel>

          <Panel title="Existing cover, assets & future goals" subtitle="Include existing policies and liquid assets carefully" icon={ShieldCheck}>
            <div className="form-grid two">
              <NumberField label="Existing life insurance cover" value={profile.existing_cover} min={0} onChange={(v) => updateProfile("existing_cover", v)} prefix="₹" />
              <NumberField label="Assets available for family needs" value={profile.existing_assets} min={0} onChange={(v) => updateProfile("existing_assets", v)} prefix="₹" />
              <NumberField label="Current cost of future goals" value={profile.future_goals} min={0} onChange={(v) => updateProfile("future_goals", v)} prefix="₹" />
              <NumberField label="Expected inflation" value={profile.inflation} min={0} max={20} step={0.5} onChange={(v) => updateProfile("inflation", v)} suffix="%" />
              <NumberField label="Discount rate assumption" value={profile.discount_rate} min={0} max={20} step={0.5} onChange={(v) => updateProfile("discount_rate", v)} suffix="%" />
            </div>
          </Panel>

          <div className="assessment-actions">
            <button className="btn-secondary" onClick={() => {
              Object.entries(INITIAL_PROFILE).forEach(([key, value]) => updateProfile(key, value));
            }}>
              <RotateCcw size={16} /> Reset inputs
            </button>
            <button className="btn-primary" onClick={calculateWithBackend} disabled={apiLoading}>
              <Calculator size={17} />
              {apiLoading ? "Calculating…" : "Calculate & save assessment"}
              {!apiLoading && <ArrowRight size={16} />}
            </button>
          </div>
        </div>

        <div className="assessment-aside">
          <Panel title="Assessment progress" subtitle="Complete your core inputs" icon={ClipboardCheck}>
            <div className="completion-number">{completion}%</div>
            <ProgressBar value={completion} />
            <p className="muted small">Completeness is based on valid input ranges, not on document verification.</p>
            <div className="aside-checks">
              <span><CheckCircle2 size={16} /> Income & expenses</span>
              <span><CheckCircle2 size={16} /> Existing cover</span>
              <span><CheckCircle2 size={16} /> Future goals</span>
              <span><CheckCircle2 size={16} /> Liabilities</span>
            </div>
          </Panel>

          <Panel title="Estimated result" subtitle="Calculated from your current inputs" icon={Activity} className="result-panel">
            <div className="result-total-label">Total estimated need</div>
            <div className="result-total">{CRORE(result.total_needs)}</div>
            <div className="result-divider" />
            <Metric label="Existing cover" value={CRORE(profile.existing_cover)} />
            <Metric label="Estimated gap" value={CRORE(result.coverage_gap)} />
            <Metric label="Income replacement" value={CRORE(result.income_replacement)} />
            <div className="result-note"><Lightbulb size={16} /> Review assumptions with a qualified professional.</div>
          </Panel>

          <div className="privacy-card">
            <LockKeyhole size={19} />
            <strong>Privacy reminder</strong>
            <p>Enter only the financial details needed for this estimate. Never share OTPs, passwords or bank login credentials.</p>
          </div>
        </div>
      </div>
      <Disclaimer />
    </>
  );
}

function NumberField({ label, value, onChange, min = 0, max, step = 1, prefix, suffix }) {
  return (
    <Field label={label}>
      <div className="number-input-wrap">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value ?? ""}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
    </Field>
  );
}

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-help">{hint}</span>}
    </label>
  );
}

function CoveragePage({ profile, result, policies, navigate }) {
  const items = [
    ["Income replacement", result.income_replacement, "Present value of annual surplus over the planning horizon"],
    ["Loans & liabilities", result.loans_and_liabilities, "Outstanding debts entered in your assessment"],
    ["Inflation-adjusted goals", result.future_goals_adjusted, "Future goals adjusted using your inflation assumption"],
    ["Assets deducted", -result.assets_deducted, "Assets entered as available to support family needs"],
  ];

  return (
    <>
      <PageTitle eyebrow="COVERAGE BREAKDOWN" title="Understand your protection gap" description="See how each input contributes to your estimated need, and review existing policy records." />
      <div className="stat-grid three">
        <StatCard label="Total estimated need" value={CRORE(result.total_needs)} icon={Calculator} tone="blue" />
        <StatCard label="Existing life cover" value={CRORE(profile.existing_cover)} icon={ShieldCheck} tone="green" />
        <StatCard label="Estimated gap" value={CRORE(result.coverage_gap)} icon={AlertTriangle} tone="orange" />
      </div>
      <Panel title="Transparent needs calculation" subtitle={result.method} icon={Scale}>
        <div className="breakdown-list">
          {items.map(([label, value, description]) => (
            <div className="breakdown-row" key={label}>
              <div className="breakdown-copy"><strong>{label}</strong><span>{description}</span></div>
              <strong className={value < 0 ? "negative-value" : ""}>{value < 0 ? "−" : ""}{CRORE(Math.abs(value))}</strong>
            </div>
          ))}
          <div className="breakdown-row total-row"><div className="breakdown-copy"><strong>Estimated total need after assets</strong><span>Floor of zero applied</span></div><strong>{CRORE(result.total_needs)}</strong></div>
          <div className="breakdown-row"><div className="breakdown-copy"><strong>Less: existing life cover</strong><span>Cover entered in your profile</span></div><strong className="negative-value">−{CRORE(profile.existing_cover)}</strong></div>
          <div className="breakdown-row gap-row"><div className="breakdown-copy"><strong>Estimated coverage gap</strong><span>Additional cover potentially worth evaluating</span></div><strong>{CRORE(result.coverage_gap)}</strong></div>
        </div>
      </Panel>
      <Panel title="Existing policy records" subtitle="Records you have added to your policy vault" icon={FileText} action={<button className="text-button" onClick={() => navigate("My Policies")}>Manage policies <ArrowRight size={15} /></button>}>
        {policies.length ? (
          <div className="table-wrap"><table><thead><tr><th>Policy</th><th>Insurer</th><th>Sum assured</th><th>Annual premium</th></tr></thead><tbody>
            {policies.map((policy) => <tr key={policy.id}><td>{policy.policy_name}</td><td>{policy.insurer}</td><td>{MONEY(policy.sum_assured)}</td><td>{MONEY(policy.premium)}</td></tr>)}
          </tbody></table></div>
        ) : <EmptyState icon={FileText} title="No policies recorded yet" text="Add your existing policies to improve the accuracy of your assessment." action={<button className="btn-primary" onClick={() => navigate("My Policies")}>Add a policy <Plus size={16} /></button>} />}
      </Panel>
      <Disclaimer />
    </>
  );
}

function SimulatorPage({ scenario, setScenario, scenarioCost, profile, result }) {
  function update(key, value) {
    setScenario((current) => ({ ...current, [key]: value }));
  }

  const scenarios = [
    { title: "New child", description: "Add childcare, education and long-term family costs.", icon: Baby, multiplier: 1.2 },
    { title: "Home purchase", description: "Review the impact of a larger mortgage or loan.", icon: House, multiplier: 1.3 },
    { title: "Education goal", description: "Explore how inflation changes future education costs.", icon: GraduationCap, multiplier: 1.15 },
    { title: "Medical reserve", description: "Stress-test the household budget with a reserve.", icon: Stethoscope, multiplier: 1.1 },
  ];

  return (
    <>
      <PageTitle eyebrow="PLAN FOR CHANGE" title="Life-event simulator" description="Explore how time and inflation change the cost of a future financial goal." />
      <div className="content-grid two-one">
        <Panel title="Adjust your scenario" subtitle="Change the assumptions to explore future values" icon={TrendingUp}>
          <div className="scenario-controls">
            <NumberField label="Current cost of goal" value={scenario.futureCost} min={0} onChange={(v) => update("futureCost", v)} prefix="₹" />
            <div className="slider-field">
              <div className="slider-label"><span>Years into the future</span><strong>{scenario.years} years</strong></div>
              <input type="range" min="1" max="40" value={scenario.years} onChange={(e) => update("years", Number(e.target.value))} />
              <div className="slider-range"><span>1 year</span><span>40 years</span></div>
            </div>
            <div className="slider-field">
              <div className="slider-label"><span>Annual inflation assumption</span><strong>{scenario.inflation}%</strong></div>
              <input type="range" min="0" max="12" step="0.5" value={scenario.inflation} onChange={(e) => update("inflation", Number(e.target.value))} />
              <div className="slider-range"><span>0%</span><span>12%</span></div>
            </div>
          </div>
          <div className="scenario-result">
            <span>Estimated future cost</span>
            <strong>{CRORE(scenarioCost)}</strong>
            <p>Compared with today's cost of {CRORE(scenario.futureCost)}, the illustrative increase is {CRORE(scenarioCost - scenario.futureCost)}.</p>
          </div>
        </Panel>

        <Panel title="Your current planning context" subtitle="Based on your needs assessment" icon={Calculator}>
          <div className="scenario-context">
            <Metric label="Current estimated coverage gap" value={CRORE(result.coverage_gap)} />
            <Metric label="Planning horizon" value={`${profile.years} years`} />
            <Metric label="Inflation in assessment" value={`${profile.inflation}%`} />
          </div>
          <div className="insight-strip"><Lightbulb size={17} /><span>This simulator estimates future costs only. It does not issue a policy quote or change your saved coverage calculation.</span></div>
        </Panel>
      </div>

      <h2 className="section-heading">Explore common life events</h2>
      <div className="event-grid">
        {scenarios.map((item) => {
          const Icon = item.icon;
          const amount = scenario.futureCost * item.multiplier;
          return (
            <button className="event-card" key={item.title} onClick={() => update("futureCost", Math.round(amount))}>
              <div className="event-icon"><Icon size={22} /></div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <span>Use as starting point <ArrowRight size={14} /></span>
            </button>
          );
        })}
      </div>
      <Disclaimer />
    </>
  );
}

function AffordabilityPage({ profile, updateProfile, result, affordableAnnualPremium }) {
  const monthlyBudget = Math.max(0, Number(profile.monthly_budget) || 0);
  const yearlyBudget = monthlyBudget * 12;
  const share = profile.annual_income > 0
    ? (yearlyBudget / profile.annual_income) * 100
    : 0;

  return (
    <>
      <PageTitle eyebrow="PLAN WITHIN YOUR MEANS" title="Coverage affordability optimizer" description="Set a comfortable budget and use it as a planning constraint. Actual premiums must come from an insurer's current quote." />
      <div className="content-grid two-one">
        <Panel title="Set your monthly budget" subtitle="Choose an amount that fits your household finances" icon={Wallet}>
          <NumberField label="Monthly budget for life insurance" value={profile.monthly_budget} min={0} onChange={(v) => updateProfile("monthly_budget", v)} prefix="₹" />
          <div className="slider-field top-gap">
            <div className="slider-label"><span>Monthly budget</span><strong>{MONEY(monthlyBudget)}</strong></div>
            <input type="range" min="0" max="100000" step="500" value={Math.min(100000, monthlyBudget)} onChange={(e) => updateProfile("monthly_budget", Number(e.target.value))} />
            <div className="slider-range"><span>₹0</span><span>₹1,00,000</span></div>
          </div>
          <div className="affordability-note"><ShieldCheck size={19} /><span>Prioritize sustainable premiums. Avoid buying cover that you may struggle to maintain.</span></div>
        </Panel>
        <Panel title="Your budget snapshot" subtitle="Calculated from your entered profile" icon={IndianRupee}>
          <div className="budget-hero"><span>Annual budget ceiling</span><strong>{MONEY(affordableAnnualPremium)}</strong><small>Budget ceiling, not an insurance quote</small></div>
          <Metric label="Monthly budget" value={MONEY(monthlyBudget)} />
          <Metric label="Share of entered annual income" value={`${share.toFixed(1)}%`} />
          <Metric label="Estimated coverage gap" value={CRORE(result.coverage_gap)} />
          <ProgressBar value={Math.min(100, share)} tone="purple" />
        </Panel>
      </div>
      <Panel title="Before choosing a policy" subtitle="Compare the complete policy, not just the premium" icon={ClipboardCheck}>
        <div className="checklist-grid">
          {[
            "Check the premium-payment term and due dates.",
            "Read exclusions, waiting periods and claim conditions.",
            "Compare cover amount and policy duration.",
            "Check whether benefits are guaranteed or illustrative.",
            "Consider income stability and emergency savings.",
            "Verify insurer and intermediary details independently.",
          ].map((item) => <div className="checklist-item" key={item}><CheckCircle2 size={18} /><span>{item}</span></div>)}
        </div>
      </Panel>
      <Disclaimer />
    </>
  );
}

function RecommendationsPage({ profile, result, navigate }) {
  const hasGap = result.coverage_gap > 0;
  const recommendations = [
    {
      title: "Review pure protection options",
      label: "PROTECTION",
      icon: ShieldCheck,
      text: "If your main goal is family income protection, compare term-life products and their policy terms.",
      reason: hasGap ? `Your estimate shows a potential gap of ${CRORE(result.coverage_gap)}.` : "Your current estimate does not show a positive gap, but assumptions should still be reviewed.",
    },
    {
      title: "Revisit future goals",
      label: "PLANNING",
      icon: GraduationCap,
      text: "Check whether education, housing and other major goals are represented realistically.",
      reason: `Your assessment currently uses ${profile.inflation}% inflation over ${profile.years} years.`,
    },
    {
      title: "Check affordability",
      label: "BUDGET",
      icon: Wallet,
      text: "Compare real quotes against a sustainable household budget before committing.",
      reason: `Your entered budget is ${MONEY(profile.monthly_budget)} per month.`,
    },
  ];

  return (
    <>
      <PageTitle eyebrow="EXPLAINABLE GUIDANCE" title="Your next best steps" description="These are planning prompts derived from your inputs, not personalized product recommendations or verified insurer offers." />
      <div className="recommendation-banner">
        <div className="recommendation-banner-icon"><Sparkles size={26} /></div>
        <div><strong>Why these steps?</strong><p>LifeShield prioritizes transparent needs analysis, affordability, and understanding policy terms before selecting a product.</p></div>
      </div>
      <div className="recommendation-grid">
        {recommendations.map((item, index) => {
          const Icon = item.icon;
          return (
            <Panel key={item.title} className="recommendation-card">
              <div className="recommendation-top"><span className="recommendation-label">{item.label}</span><div className="panel-icon"><Icon size={21} /></div></div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
              <div className="recommendation-reason"><Lightbulb size={16} /><span>{item.reason}</span></div>
              <button className="text-button" onClick={() => navigate(index === 0 ? "Compare Products" : index === 1 ? "Life-Event Simulator" : "Affordability Optimizer")}>Explore this step <ArrowRight size={15} /></button>
            </Panel>
          );
        })}
      </div>
      <Panel title="Recommendation principles" subtitle="What the platform should explain before a customer acts" icon={BookOpen}>
        <div className="checklist-grid">
          {[
            "Explain the assumptions behind the estimate.",
            "Separate product facts from AI-generated explanations.",
            "Show premium, cover, exclusions and limitations together.",
            "Do not claim a product is best without verified evidence.",
          ].map((text) => <div className="checklist-item" key={text}><CheckCircle2 size={18} /><span>{text}</span></div>)}
        </div>
      </Panel>
      <Disclaimer />
    </>
  );
}

function ProductsPage({ products, query, setQuery, navigate }) {
  return (
    <>
      <PageTitle eyebrow="TRANSPARENT COMPARISON" title="Compare product features" description="Review product concepts and comparison criteria. Current insurer catalogue data and live quotes must be connected before purchase decisions." />
      <div className="search-toolbar">
        <div className="search-input"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search product, insurer or type…" /></div>
        <span className="status-tag">Demo catalogue</span>
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <div className="product-card" key={product.id}>
            <div className="product-card-top"><div className="product-icon"><ShieldCheck size={24} /></div><span className="demo-badge">{product.source || "DEMO DATA"}</span></div>
            <div className="product-insurer">{product.insurer}</div>
            <h3>{product.name}</h3>
            <span className="product-type">{product.type}</span>
            <p>{product.description}</p>
            <div className="product-facts">
              <div><span>Verification</span><strong>{product.verified ? "Verified feed" : "Not verified"}</strong></div>
              <div><span>Live quote</span><strong>Unavailable</strong></div>
            </div>
            <button className="btn-secondary full-width" onClick={() => navigate("Policy Finder")}>View comparison checklist <ArrowRight size={15} /></button>
          </div>
        ))}
      </div>
      <Panel title="What to compare" subtitle="Use these criteria for every real policy" icon={Scale}>
        <div className="comparison-table">
          {[
            ["Coverage amount", "Does the benefit meet the customer's assessed needs?"],
            ["Premium and payment term", "Is the premium sustainable and clearly disclosed?"],
            ["Exclusions and conditions", "What circumstances may limit or exclude a claim?"],
            ["Policy term", "Does cover last for the intended protection period?"],
            ["Claim process", "What documents and conditions apply?"],
            ["Source and date", "Was the information obtained from an authorized current source?"],
          ].map(([a, b]) => <div className="comparison-row" key={a}><strong>{a}</strong><span>{b}</span></div>)}
        </div>
      </Panel>
      <Disclaimer />
    </>
  );
}

function PolicyFinderPage({ products, query, setQuery, navigate }) {
  return (
    <>
      <PageTitle eyebrow="POLICY DISCOVERY" title="Policy finder" description="Start with your needs and budget, then validate real products with an authorized insurer or intermediary." />
      <Panel title="Search the current catalogue" subtitle="This environment uses demonstration entries until a verified product feed is connected" icon={Search}>
        <div className="search-input full-search"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by product type or insurer…" /></div>
        <div className="finder-results">
          {products.map((product) => <div className="finder-result" key={product.id}><div className="product-icon"><Shield size={20} /></div><div className="finder-copy"><strong>{product.name}</strong><span>{product.type} · {product.insurer}</span><p>{product.description}</p></div><span className="demo-badge">DEMO</span></div>)}
          {!products.length && <EmptyState icon={Search} title="No matching items" text="Try a different search term." />}
        </div>
      </Panel>
      <div className="info-banner"><AlertTriangle size={19} /><div><strong>Not a quote engine</strong><p>No real premium, underwriting decision, product eligibility or purchase confirmation is provided here.</p></div></div>
      <button className="btn-primary" onClick={() => navigate("Talk to an Advisor")}>Prepare an advisor request <ArrowRight size={16} /></button>
    </>
  );
}

function ApplicationPage({ profile, policies, navigate }) {
  const steps = [
    ["Understand needs", "Complete your needs assessment and review assumptions.", true, "My Assessment"],
    ["Review existing cover", "Record existing policies and avoid double-counting cover.", policies.length > 0, "My Policies"],
    ["Compare verified products", "Check official policy wording and real premium quotes.", false, "Compare Products"],
    ["Complete insurer application", "Use the insurer's authorized application journey.", false, "Talk to an Advisor"],
  ];

  return (
    <>
      <PageTitle eyebrow="APPLICATION READINESS" title="Your application journey" description="Track preparation steps before proceeding through an insurer's official application process." />
      <Panel title="Your progress" subtitle="This tracker records readiness only; it does not submit an insurance application" icon={ClipboardCheck}>
        <div className="journey-list">
          {steps.map(([title, description, done, destination], index) => (
            <div className="journey-step" key={title}>
              <div className={`journey-number ${done ? "done" : ""}`}>{done ? <Check size={17} /> : index + 1}</div>
              <div className="journey-step-copy"><strong>{title}</strong><span>{description}</span></div>
              <button className="btn-small" onClick={() => navigate(destination)}>{done ? "Review" : "Continue"} <ArrowRight size={14} /></button>
            </div>
          ))}
        </div>
      </Panel>
      <div className="info-banner"><LockKeyhole size={19} /><div><strong>Do not enter sensitive identity data here</strong><p>Use official insurer channels for identity documents, medical declarations, payment and application submission.</p></div></div>
      <p className="muted small">Current profile age: {profile.age} years. Existing policy records: {policies.length}.</p>
    </>
  );
}

function FraudPage({ fraudText, setFraudText, fraudResult, fraudLoading, runFraudCheck }) {
  const risk = fraudResult?.risk_level || "low";

  return (
    <>
      <PageTitle eyebrow="CUSTOMER PROTECTION" title="Fraud & scam checker" description="Screen suspicious insurance messages for warning signs. A low-risk result never proves that a message is genuine." />
      <div className="content-grid two">
        <Panel title="Check a suspicious message" subtitle="Paste the text you received" icon={ShieldAlert}>
          <form onSubmit={runFraudCheck}>
            <Field label="Message text">
              <textarea
                className="large-textarea"
                value={fraudText}
                onChange={(e) => setFraudText(e.target.value)}
                placeholder="Paste the suspicious SMS, email, or message here. Remove personal information first."
                rows={9}
                maxLength={12000}
              />
            </Field>
            <div className="textarea-footer"><span>{fraudText.length}/12000 characters</span><button type="button" className="text-button" onClick={() => { setFraudText(""); }}>Clear text <X size={14} /></button></div>
            <button className="btn-primary full-width" type="submit" disabled={fraudLoading}>{fraudLoading ? <RefreshCw size={16} className="spin" /> : <ShieldAlert size={17} />}{fraudLoading ? "Checking…" : "Analyze warning signs"}</button>
          </form>
        </Panel>
        <Panel title="Screening result" subtitle="Rule-based signals, not a legal or forensic determination" icon={Activity}>
          {fraudResult ? (
            <div className="fraud-result">
              <div className={`risk-banner risk-${risk}`}><div className="risk-icon"><AlertTriangle size={23} /></div><div><span>ASSESSED SIGNAL LEVEL</span><strong>{risk.toUpperCase()}</strong></div></div>
              <p>{fraudResult.summary}</p>
              <h4>Signals detected</h4>
              {fraudResult.signals?.length ? <ul className="signal-list">{fraudResult.signals.map((signal) => <li key={signal}><AlertTriangle size={15} />{signal}</li>)}</ul> : <p className="muted small">No signals were returned.</p>}
              <h4>Recommended next steps</h4>
              <p>{fraudResult.next_steps}</p>
              {fraudResult.fallback && <span className="status-tag">Offline fallback</span>}
            </div>
          ) : (
            <EmptyState icon={ShieldCheck} title="Ready to screen" text="Paste a message to look for common warning signs. The screening can miss sophisticated scams." />
          )}
        </Panel>
      </div>
      <div className="warning-box"><AlertTriangle size={19} /><div><strong>Never share OTPs, PINs, passwords or banking credentials.</strong><p>Verify the insurer and agent through official sources. Do not trust phone numbers or links supplied by a suspicious message.</p></div></div>
      <Disclaimer />
    </>
  );
}

function AssistantPage({ messages, chatInput, setChatInput, sendChat, chatLoading, apiHealth }) {
  return (
    <>
      <PageTitle eyebrow="AI INSURANCE EDUCATION" title="Ask LifeShield AI" description="Understand life insurance concepts, assessment assumptions, exclusions and affordability in plain language." />
      <div className="assistant-layout">
        <Panel title="Insurance education assistant" subtitle={`Provider: ${apiHealth?.ai_provider || "not configured"}`} icon={Bot} className="chat-panel">
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
                <div className="chat-avatar">{message.role === "assistant" ? <Bot size={17} /> : <Users size={17} />}</div>
                <div className="chat-bubble"><span>{message.role === "assistant" ? "LifeShield AI" : "You"}</span><p>{message.text}</p></div>
              </div>
            ))}
            {chatLoading && <div className="typing-indicator"><span /><span /><span /> AI is preparing a response…</div>}
          </div>
          <form className="chat-composer" onSubmit={sendChat}>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder="Ask about coverage, premiums, exclusions…" maxLength={5000} />
            <button className="btn-primary" type="submit" disabled={chatLoading || !chatInput.trim()}><Send size={17} /><span>Send</span></button>
          </form>
          <p className="chat-disclaimer">AI responses may be inaccurate. Verify important policy facts with official documents. Do not submit identity or banking secrets.</p>
        </Panel>
        <div className="assistant-side">
          <Panel title="Suggested questions" subtitle="Start with one of these" icon={Lightbulb}>
            {[
              "How is my coverage gap calculated?",
              "What should I compare in term insurance?",
              "How does inflation affect education costs?",
              "What are common exclusions to review?",
            ].map((question) => (
              <button className="suggestion-button" key={question} onClick={() => setChatInput(question)}>{question}<ArrowRight size={15} /></button>
            ))}
          </Panel>
          <div className="privacy-card"><LockKeyhole size={19} /><strong>Use AI safely</strong><p>Share only the information needed to answer your question. AI output is educational, not a policy decision.</p></div>
        </div>
      </div>
    </>
  );
}

function SchemesPage() {
  const schemes = [
    {
      title: "Pradhan Mantri Jeevan Jyoti Bima Yojana (PMJJBY)",
      category: "Life insurance scheme",
      text: "Review current eligibility, enrollment conditions, premium, benefits and claim requirements through official government or participating-bank sources.",
      url: "https://jansuraksha.gov.in/",
    },
    {
      title: "Pradhan Mantri Suraksha Bima Yojana (PMSBY)",
      category: "Accident insurance scheme",
      text: "This is accident cover, not a substitute for a complete life-insurance needs assessment. Confirm current terms through official sources.",
      url: "https://jansuraksha.gov.in/",
    },
    {
      title: "IRDAI consumer resources",
      category: "Regulatory education",
      text: "Use official consumer resources to understand insurance, grievances and how to verify regulated entities.",
      url: "https://irdai.gov.in/",
    },
  ];

  return (
    <>
      <PageTitle eyebrow="PUBLIC RESOURCES" title="Government schemes & official resources" description="Learn where to verify insurance schemes and regulatory information. Always confirm current eligibility and terms." />
      <div className="scheme-grid">
        {schemes.map((scheme) => (
          <div className="scheme-card" key={scheme.title}>
            <div className="scheme-icon"><Landmark size={23} /></div>
            <span className="scheme-category">{scheme.category}</span>
            <h3>{scheme.title}</h3>
            <p>{scheme.text}</p>
            <a href={scheme.url} target="_blank" rel="noreferrer" className="external-link">Open official resource <ExternalLink size={15} /></a>
          </div>
        ))}
      </div>
      <div className="info-banner"><Lightbulb size={19} /><div><strong>Official information can change</strong><p>LifeShield AI does not determine eligibility or enroll users in a government scheme. Confirm the latest details with the official program or participating institution.</p></div></div>
    </>
  );
}

function PoliciesPage({ policies, policyForm, setPolicyForm, addPolicy, deletePolicy }) {
  function set(key, value) {
    setPolicyForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <PageTitle eyebrow="YOUR POLICY VAULT" title="My policies" description="Keep a personal record of existing life insurance policies to support your needs assessment." />
      <div className="content-grid two-one">
        <Panel title="Add a policy record" subtitle="Enter only information needed for your personal record" icon={Plus}>
          <form className="stack-form" onSubmit={addPolicy}>
            <Field label="Insurer"><input required value={policyForm.insurer} onChange={(e) => set("insurer", e.target.value)} placeholder="Insurer name" maxLength={120} /></Field>
            <Field label="Policy name"><input required value={policyForm.policy_name} onChange={(e) => set("policy_name", e.target.value)} placeholder="Policy name" maxLength={160} /></Field>
            <Field label="Policy number (optional)"><input value={policyForm.policy_number} onChange={(e) => set("policy_number", e.target.value)} placeholder="Avoid storing sensitive identifiers" maxLength={100} /></Field>
            <div className="form-grid two">
              <NumberField label="Sum assured" value={policyForm.sum_assured} min={0} onChange={(v) => set("sum_assured", String(v))} prefix="₹" />
              <NumberField label="Annual premium" value={policyForm.premium} min={0} onChange={(v) => set("premium", String(v))} prefix="₹" />
            </div>
            <Field label="Renewal date"><input type="date" value={policyForm.renewal_date} onChange={(e) => set("renewal_date", e.target.value)} /></Field>
            <button className="btn-primary full-width" type="submit"><Plus size={17} /> Save policy record</button>
          </form>
        </Panel>

        <Panel title="Your policy summary" subtitle="Records currently stored" icon={FileText}>
          <div className="policy-summary-number">{policies.length}</div>
          <span className="muted">Saved policy records</span>
          <div className="result-divider" />
          <Metric label="Combined recorded cover" value={CRORE(policies.reduce((sum, item) => sum + Number(item.sum_assured || 0), 0))} />
          <Metric label="Combined annual premium" value={MONEY(policies.reduce((sum, item) => sum + Number(item.premium || 0), 0))} />
          <div className="insight-strip"><ShieldCheck size={17} /><span>Records entered by you are not independently verified.</span></div>
        </Panel>
      </div>

      <Panel title="Saved policies" subtitle="Manage the policy records in your vault" icon={ClipboardCheck}>
        {policies.length ? (
          <div className="policy-list">
            {policies.map((policy) => (
              <div className="policy-record" key={policy.id}>
                <div className="policy-record-icon"><FileText size={21} /></div>
                <div className="policy-record-copy"><strong>{policy.policy_name}</strong><span>{policy.insurer} · {policy.policy_number || "No policy number saved"}</span><div className="policy-record-meta"><span>Cover: {MONEY(policy.sum_assured)}</span><span>Annual premium: {MONEY(policy.premium)}</span>{policy.renewal_date && <span>Renewal: {policy.renewal_date}</span>}</div>{policy.localOnly && <span className="status-tag">Local only</span>}</div>
                <button className="icon-button danger-icon" onClick={() => deletePolicy(policy)} aria-label={`Delete ${policy.policy_name}`}><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={FileText} title="Your policy vault is empty" text="Add your current policy details to see your total recorded cover." />}
      </Panel>
      <Disclaimer />
    </>
  );
}

function RemindersPage({ reminders, reminderForm, setReminderForm, addReminder, setReminders }) {
  return (
    <>
      <PageTitle eyebrow="STAY ORGANIZED" title="Premium reminders" description="Record renewal dates and follow-up tasks. This MVP stores reminders but does not send push notifications, SMS or emails." />
      <div className="content-grid two-one">
        <Panel title="Create a reminder" subtitle="Add a due date and a short description" icon={Bell}>
          <form className="stack-form" onSubmit={addReminder}>
            <Field label="Reminder title"><input required value={reminderForm.title} onChange={(e) => setReminderForm((current) => ({ ...current, title: e.target.value }))} placeholder="e.g. Review policy renewal" maxLength={180} /></Field>
            <Field label="Due date"><input type="date" value={reminderForm.due_date} onChange={(e) => setReminderForm((current) => ({ ...current, due_date: e.target.value }))} /></Field>
            <button className="btn-primary full-width" type="submit"><Plus size={17} /> Save reminder</button>
          </form>
        </Panel>
        <Panel title="Reminder overview" subtitle="Current reminder records" icon={CalendarClock}>
          <div className="policy-summary-number">{reminders.length}</div>
          <span className="muted">Saved reminders</span>
          <div className="result-divider" />
          <p className="muted small">Add calendar or notification integrations before using this for time-critical reminders.</p>
        </Panel>
      </div>
      <Panel title="Upcoming reminders" subtitle="Your saved tasks" icon={Bell}>
        {reminders.length ? (
          <div className="reminder-list">
            {reminders.map((reminder) => (
              <div className="reminder-row" key={reminder.id}>
                <div className="reminder-icon"><CalendarClock size={20} /></div>
                <div className="reminder-copy"><strong>{reminder.title}</strong><span>{reminder.due_date || "No due date set"}</span></div>
                <button className="icon-button danger-icon" onClick={() => setReminders((current) => current.filter((item) => item.id !== reminder.id))} aria-label="Remove reminder"><Trash2 size={17} /></button>
              </div>
            ))}
          </div>
        ) : <EmptyState icon={Bell} title="No reminders yet" text="Create a reminder for your next policy review or renewal." />}
      </Panel>
    </>
  );
}

function AdvisorPage({ advisorForm, setAdvisorForm, submitAdvisorRequest, advisorRequests }) {
  function set(key, value) {
    setAdvisorForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <>
      <PageTitle eyebrow="HUMAN SUPPORT" title="Talk to an advisor" description="Prepare a consultation request and explain what you want to discuss. A submitted request is not a confirmed appointment." />
      <div className="content-grid two-one">
        <Panel title="Consultation request" subtitle="Choose a topic and preferred date" icon={HeartHandshake}>
          <form className="stack-form" onSubmit={submitAdvisorRequest}>
            <Field label="Discussion topic">
              <select value={advisorForm.topic} onChange={(e) => set("topic", e.target.value)}>
                <option>Coverage review</option>
                <option>Understanding policy exclusions</option>
                <option>Premium affordability</option>
                <option>Existing policy review</option>
                <option>Claims process education</option>
              </select>
            </Field>
            <Field label="Preferred date"><input type="date" value={advisorForm.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} min={new Date().toISOString().slice(0, 10)} /></Field>
            <Field label="Notes (optional)"><textarea rows={4} value={advisorForm.notes} onChange={(e) => set("notes", e.target.value)} maxLength={3000} placeholder="Describe your questions. Do not include sensitive identity or banking information." /></Field>
            <button className="btn-primary full-width" type="submit">Submit request <ArrowRight size={16} /></button>
          </form>
        </Panel>
        <Panel title="Prepare for your meeting" subtitle="Get more value from a consultation" icon={ClipboardCheck}>
          <div className="action-list">
            <ActionItem number="01" title="Know your financial goals" description="List your dependents, liabilities and future expenses." onClick={() => {}} />
            <ActionItem number="02" title="Gather policy documents" description="Use official documents and hide unnecessary personal identifiers." onClick={() => {}} />
            <ActionItem number="03" title="Ask about exclusions" description="Request explanations of limitations, claims and premiums." onClick={() => {}} />
          </div>
        </Panel>
      </div>
      <Panel title="Your submitted requests" subtitle="Requests recorded in this workspace" icon={CalendarClock}>
        {advisorRequests.length ? advisorRequests.map((item, index) => (
          <div className="reminder-row" key={item.id || index}><div className="reminder-icon"><HeartHandshake size={20} /></div><div className="reminder-copy"><strong>{item.topic}</strong><span>{item.preferred_date || "No preferred date"} · Request only, not confirmed</span></div><span className="status-tag">Requested</span></div>
        )) : <EmptyState icon={HeartHandshake} title="No consultation requests" text="Your submitted requests will appear here." />}
      </Panel>
    </>
  );
}

function ReportsPage({ profile, result, policies, reminders, exportReport }) {
  return (
    <>
      <PageTitle eyebrow="YOUR RECORDS" title="Reports & assessment summary" description="Export a snapshot of your current assessment inputs and saved records." action={<button className="btn-primary" onClick={exportReport}><FileText size={16} /> Export JSON report</button>} />
      <div className="stat-grid three">
        <StatCard label="Estimated total need" value={CRORE(result.total_needs)} icon={Calculator} tone="blue" />
        <StatCard label="Estimated coverage gap" value={CRORE(result.coverage_gap)} icon={Activity} tone="orange" />
        <StatCard label="Policy records" value={policies.length} icon={FileText} tone="green" />
      </div>
      <Panel title="Assessment data summary" subtitle="Current values used by the calculator" icon={ChartNoAxesCombined}>
        <div className="profile-metrics">
          <Metric label="Age" value={`${profile.age} years`} />
          <Metric label="Annual income" value={MONEY(profile.annual_income)} />
          <Metric label="Annual expenses" value={MONEY(profile.annual_expenses)} />
          <Metric label="Liabilities" value={MONEY(profile.loans)} />
          <Metric label="Existing assets" value={MONEY(profile.existing_assets)} />
          <Metric label="Existing life cover" value={MONEY(profile.existing_cover)} />
          <Metric label="Future goals today" value={MONEY(profile.future_goals)} />
          <Metric label="Inflation assumption" value={`${profile.inflation}%`} />
          <Metric label="Reminders" value={reminders.length} />
        </div>
      </Panel>
      <div className="info-banner"><FileText size={19} /><div><strong>Export format</strong><p>The download is a JSON data snapshot, not a certified financial report, insurance quotation or policy document.</p></div></div>
    </>
  );
}

function CompanyInsightsPage({ apiRequest }) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadAnalytics() {
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/company/analytics");
      setAnalytics(data);
    } catch (err) {
      setError(err.message || "Analytics are unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <PageTitle eyebrow="INSURER WORKSPACE" title="Company insights" description="Operational counters from the configured backend. Real insurer analytics require authorized roles and real company data." action={<button className="btn-primary" onClick={loadAnalytics} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} />{loading ? "Loading…" : "Refresh insights"}</button>} />
      <div className="info-banner"><LockKeyhole size={19} /><div><strong>Restricted operational data</strong><p>In production, only explicitly authorized insurer staff should access company-level information. Do not expose this endpoint publicly.</p></div></div>
      {error && <div className="inline-alert"><AlertTriangle size={17} /><span>{error}</span></div>}
      {analytics ? (
        <>
          <div className="stat-grid three">
            <StatCard label="Assessments" value={NUMBER(analytics.assessments)} icon={Calculator} tone="blue" />
            <StatCard label="Policy records" value={NUMBER(analytics.policies)} icon={FileText} tone="green" />
            <StatCard label="Advisor requests" value={NUMBER(analytics.advisor_requests)} icon={Users} tone="purple" />
          </div>
          <Panel title="Data source status" subtitle="Metrics returned by the API" icon={Activity}>
            <pre className="json-preview">{JSON.stringify(analytics, null, 2)}</pre>
          </Panel>
        </>
      ) : (
        <EmptyState icon={ChartNoAxesCombined} title="No analytics loaded" text="Press Refresh insights to request the protected backend endpoint." action={<button className="btn-secondary" onClick={loadAnalytics}>Load analytics</button>} />
      )}
      <Disclaimer />
    </>
  );
}

function SettingsPage({ user, apiHealth, apiStatus, profile, updateProfile, handleSignOut, supabaseConfigured }) {
  return (
    <>
      <PageTitle eyebrow="YOUR WORKSPACE" title="Settings & privacy" description="Review account configuration, service status and your financial planning assumptions." />
      <div className="content-grid two">
        <Panel title="Account information" subtitle="Authentication and session" icon={Users}>
          <Metric label="Email" value={user?.email || "Local demo"} />
          <Metric label="Authentication" value={supabaseConfigured ? "Supabase" : "Not configured"} />
          <Metric label="User ID" value={user?.id ? `${user.id.slice(0, 8)}…` : "Demo identity"} />
          <button className="btn-secondary full-width top-gap" onClick={handleSignOut}><LogOut size={16} /> Sign out</button>
        </Panel>
        <Panel title="System status" subtitle="Services available to this frontend" icon={Activity}>
          <Metric label="Backend API" value={apiStatus === "online" ? "Connected" : "Offline / demo"} />
          <Metric label="Database configured" value={apiHealth?.database_configured ? "Yes" : "No"} />
          <Metric label="AI provider" value={apiHealth?.ai_provider || "Not configured"} />
          <Metric label="AI ready" value={apiHealth?.ai_configured ? "Yes" : "No"} />
        </Panel>
      </div>
      <Panel title="Planning preferences" subtitle="Adjust the values used by your assessment" icon={Settings}>
        <div className="form-grid two">
          <NumberField label="Inflation assumption (%)" value={profile.inflation} min={0} max={20} step={0.5} onChange={(v) => updateProfile("inflation", v)} suffix="%" />
          <NumberField label="Discount rate assumption (%)" value={profile.discount_rate} min={0} max={20} step={0.5} onChange={(v) => updateProfile("discount_rate", v)} suffix="%" />
        </div>
      </Panel>
      <div className="warning-box"><LockKeyhole size={19} /><div><strong>Security checklist before launch</strong><p>Keep service-role and AI API keys on the backend, enforce RLS, configure staff roles through trusted admin tooling, and never commit .env files.</p></div></div>
    </>
  );
}

function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={24} /></div>
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="disclaimer">
      <CircleHelp size={16} />
      <p><strong>Important:</strong> LifeShield AI provides educational estimates and planning tools. It is not a substitute for professional advice, a verified insurer quotation, underwriting, policy wording, or an official claim decision.</p>
    </div>
  );
}