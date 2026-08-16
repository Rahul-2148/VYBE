import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Search, HelpCircle, Shield, FileText, Briefcase, Code,
  Megaphone, Info, ExternalLink, CheckCircle2, ChevronRight, ChevronDown,
  Copy, Check, Sparkles, Send, Download, Mail, Globe, Users, Heart,
  Zap, Lock, Eye, Terminal, Laptop, Rocket, Award, ShieldCheck,
  LifeBuoy, MessageSquare, AlertCircle, Play
} from "lucide-react";
import { snackbar } from "../lib/snackbar";
import logo from "../assets/logo.png";
import logo2 from "../assets/logo2.png";
import { triggerHaptic, microAudio } from "../lib/interactiveEffects";

const TABS = [
  { id: "about", label: "About", icon: Info, path: "/about" },
  { id: "help", label: "Help & Support", icon: HelpCircle, path: "/help" },
  { id: "press", label: "Press & News", icon: Megaphone, path: "/press" },
  { id: "api", label: "API & Developers", icon: Code, path: "/api" },
  { id: "jobs", label: "Careers & Jobs", icon: Briefcase, path: "/jobs" },
  { id: "privacy", label: "Privacy Policy", icon: Shield, path: "/privacy" },
  { id: "terms", label: "Terms of Service", icon: FileText, path: "/terms" },
];

export const CompanyHub = ({ defaultTab = "about" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL path or prop
  const currentTab = useMemo(() => {
    const p = location.pathname.toLowerCase();
    if (p.includes("/help") || p.includes("/support")) return "help";
    if (p.includes("/press")) return "press";
    if (p.includes("/api") || p.includes("/developer")) return "api";
    if (p.includes("/jobs") || p.includes("/careers")) return "jobs";
    if (p.includes("/privacy")) return "privacy";
    if (p.includes("/terms") || p.includes("/legal")) return "terms";
    if (p.includes("/about")) return "about";
    return defaultTab;
  }, [location.pathname, defaultTab]);

  const [activeTab, setActiveTab] = useState(currentTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState(null);

  // Modals
  const [showContactModal, setShowContactModal] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(null);
  const [showApiTokenModal, setShowApiTokenModal] = useState(false);

  // Interactive Form States
  const [ticketForm, setTicketForm] = useState({ name: "", email: "", category: "Account", message: "", priority: "Normal" });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);

  const [jobForm, setJobForm] = useState({ name: "", email: "", resumeUrl: "", portfolioUrl: "", note: "" });
  const [jobSubmitting, setJobSubmitting] = useState(false);

  const [apiForm, setApiForm] = useState({ appName: "", email: "", useCase: "Analytics & Automation" });
  const [generatedApiKey, setGeneratedApiKey] = useState(null);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState(0);

  // Code snippet language
  const [codeLang, setCodeLang] = useState("curl");

  useEffect(() => {
    setActiveTab(currentTab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    triggerHaptic("light");
    const target = TABS.find((t) => t.id === tabId);
    if (target) {
      navigate(target.path);
    }
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    microAudio.playPop();
    snackbar.success("Copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTicketSubmit = (e) => {
    e.preventDefault();
    if (!ticketForm.email || !ticketForm.message) {
      snackbar.error("Please fill all required fields");
      return;
    }
    setTicketSubmitting(true);
    setTimeout(() => {
      setTicketSubmitting(false);
      setShowContactModal(false);
      const ticketId = "VYBE-" + Math.floor(100000 + Math.random() * 900000);
      setTicketForm({ name: "", email: "", category: "Account", message: "", priority: "Normal" });
      snackbar.success(`Support ticket #${ticketId} submitted! Our team will respond within 2-4 hours.`);
    }, 900);
  };

  const handleJobSubmit = (e) => {
    e.preventDefault();
    if (!jobForm.name || !jobForm.email || !jobForm.resumeUrl) {
      snackbar.error("Please provide your name, email, and resume link");
      return;
    }
    setJobSubmitting(true);
    setTimeout(() => {
      setJobSubmitting(false);
      setShowApplyModal(null);
      setJobForm({ name: "", email: "", resumeUrl: "", portfolioUrl: "", note: "" });
      snackbar.success("Application submitted successfully! Our recruiting team will review your profile.");
    }, 1000);
  };

  const handleGenerateApiKey = (e) => {
    e.preventDefault();
    if (!apiForm.appName || !apiForm.email) {
      snackbar.error("Please enter App Name and Developer Email");
      return;
    }
    const token = "vybe_live_" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 36).toString(36)).join("");
    setGeneratedApiKey(token);
    snackbar.success("Sandbox API Key generated!");
  };

  // FAQ Items
  const FAQ_ITEMS = [
    {
      q: "How do I get verified on VYBE?",
      a: "Accounts that represent authentic, notable, and active public figures, brands, or verified creators can apply directly in Settings > Account Security & Verification, or reach out with portfolio credentials.",
      cat: "Account & Verification"
    },
    {
      q: "How does 2-Factor Authentication (2FA) protect my account?",
      a: "2FA adds an essential security layer. When enabled in Security Settings, signing in requires both your password/magic link and a time-based 6-digit TOTP authentication code.",
      cat: "Security"
    },
    {
      q: "How do Creator Monetization and Payouts work?",
      a: "Creators with 1,000+ followers can activate the Monetization Dashboard to receive subscriber tips, virtual badges, and brand sponsorship revenue with instant payout transfers.",
      cat: "Monetization"
    },
    {
      q: "How do I request a creator's phone number or contact info?",
      a: "On a creator's profile, click 'Contact Info'. If the creator has restricted their direct number, you can send an interactive Contact Request in chat, which they can approve or decline.",
      cat: "Messaging & Privacy"
    },
    {
      q: "What video specifications are recommended for Reels?",
      a: "We recommend 1080x1920 (9:16 portrait) MP4/MOV formats up to 60fps and 100MB per video. Our adaptive streaming engine transcodes to multiple bitrates for zero-buffering playback.",
      cat: "Content & Uploads"
    },
    {
      q: "How do I report inappropriate content or copyright violations?",
      a: "Click the 3-dots menu on any post, reel, or story and select 'Report'. Our automated AI safety filters and 24/7 human moderation team review reports in real-time.",
      cat: "Safety & Community"
    }
  ];

  const filteredFaqs = useMemo(() => {
    if (!searchQuery.trim()) return FAQ_ITEMS;
    const q = searchQuery.toLowerCase();
    return FAQ_ITEMS.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q));
  }, [searchQuery]);

  // Careers Jobs List
  const JOB_LISTINGS = [
    {
      id: "eng-1",
      title: "Senior Full-Stack Engineer (React & Node.js)",
      team: "Core Product & Messaging",
      location: "Remote (Global)",
      type: "Full-Time",
      experience: "4+ years",
      desc: "Architect and scale real-time chat, group communication channels, and interactive media pipelines serving millions of active users."
    },
    {
      id: "ai-2",
      title: "Lead AI/ML Video Processing Engineer",
      team: "Reels & Media Intelligence",
      location: "San Francisco / Remote",
      type: "Full-Time",
      experience: "5+ years",
      desc: "Build state-of-the-art computer vision models for reel recommendation, auto-captioning, audio alignment, and real-time moderation."
    },
    {
      id: "des-3",
      title: "Principal Product Designer",
      team: "Design Systems & Mobile",
      location: "London / Remote",
      type: "Full-Time",
      experience: "5+ years",
      desc: "Craft magical, fluid, and accessible micro-interactions, dark mode design systems, and storytelling interfaces."
    },
    {
      id: "eng-4",
      title: "Senior Mobile Engineer (React Native / iOS & Android)",
      team: "Mobile Experience",
      location: "Remote (Global)",
      type: "Full-Time",
      experience: "3+ years",
      desc: "Build smooth 60fps native gestures, background video caching, WebRTC calling, and camera filter pipelines."
    },
    {
      id: "rel-5",
      title: "Creator Partnerships & Community Lead",
      team: "Growth & Creator Economy",
      location: "New York / Mumbai / Remote",
      type: "Full-Time",
      experience: "3+ years",
      desc: "Partner with top creators, musicians, and digital brands to accelerate creator monetization and platform adoption."
    },
    {
      id: "sec-6",
      title: "Site Reliability & Security Architect",
      team: "Infrastructure & Trust",
      location: "Remote (Global)",
      type: "Full-Time",
      experience: "5+ years",
      desc: "Ensure 99.99% global uptime, zero-trust infrastructure, automated threat mitigation, and E2E encrypted key exchanges."
    }
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col selection:bg-rose-500 selection:text-white font-sans">
      {/* Top Floating Glass Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-black/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-zinc-300 hover:text-white transition cursor-pointer"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div
              onClick={() => navigate("/")}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <img src={logo} alt="VYBE" className="h-7 object-contain theme-logo-adaptive" />
              <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-widest">
                Enterprise & Legal Hub
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowContactModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition shadow-md shadow-rose-500/20 cursor-pointer active:scale-95"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Contact Support</span>
            </button>
            <button
              onClick={() => navigate("/")}
              className="px-3.5 py-1.5 rounded-full border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 text-xs font-semibold text-zinc-300 hover:text-white transition cursor-pointer"
            >
              Open App
            </button>
          </div>
        </div>

        {/* Horizontal Tab Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto hide-scrollbar border-t border-zinc-900/80">
          <div className="flex items-center gap-1 py-2 min-w-max">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                    isActive
                      ? "bg-white text-black shadow-md"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-black" : "text-zinc-500"}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* ================= 1. ABOUT TAB ================= */}
        {activeTab === "about" && (
          <div className="space-y-16 animate-fadeIn">
            {/* Hero Section */}
            <div className="text-center max-w-3xl mx-auto space-y-6 pt-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Empowering the Next Generation of Creators</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
                Where Connection Meets Creativity & Ownership.
              </h1>
              <p className="text-base sm:text-lg text-zinc-400 leading-relaxed">
                VYBE is a next-generation social ecosystem built from the ground up for authentic creators, vibrant micro-communities, and real-time storytelling without artificial barriers.
              </p>
            </div>

            {/* Platform Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Active Creators", val: "10M+", sub: "Across 140+ countries" },
                { label: "Reels Streamed Daily", val: "500M+", sub: "Ultra low-latency" },
                { label: "Messages Exchanged", val: "2.4B+", sub: "End-to-End Encrypted" },
                { label: "Creator Earnings Paid", val: "$45M+", sub: "Direct payouts" },
              ].map((stat, i) => (
                <div key={i} className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800/80 flex flex-col justify-between hover:border-zinc-700 transition">
                  <p className="text-2xl sm:text-4xl font-black text-white tracking-tight">{stat.val}</p>
                  <div className="mt-3">
                    <p className="text-sm font-bold text-zinc-200">{stat.label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{stat.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Core Product Pillars */}
            <div className="space-y-8">
              <div className="text-center max-w-xl mx-auto">
                <h2 className="text-2xl sm:text-3xl font-black text-white">The VYBE Ecosystem</h2>
                <p className="text-sm text-zinc-400 mt-2">Engineered with speed, aesthetic perfection, and deep creator respect.</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    icon: Play,
                    title: "Reels Engine",
                    desc: "Silky 60fps short video feed with live music remixing, gesture-driven interactions, and adaptive bitrates.",
                    color: "text-rose-500",
                    bg: "bg-rose-500/10"
                  },
                  {
                    icon: MessageSquare,
                    title: "Realtime Messaging & Presence",
                    desc: "Voice recorder with waveform visualizer, screen sharing, media lightboxes, and instant contact requests.",
                    color: "text-purple-400",
                    bg: "bg-purple-500/10"
                  },
                  {
                    icon: Award,
                    title: "Creator Economy & Badges",
                    desc: "Built-in subscriptions, tipping, branded content attribution, and customizable profile portfolios.",
                    color: "text-amber-400",
                    bg: "bg-amber-500/10"
                  },
                  {
                    icon: ShieldCheck,
                    title: "Zero-Compromise Security",
                    desc: "Two-Factor Auth, biometric passkeys, granular direct message filters, and full session monitoring.",
                    color: "text-emerald-400",
                    bg: "bg-emerald-500/10"
                  },
                  {
                    icon: Users,
                    title: "Niche Communities",
                    desc: "Join high-signal creator guilds, topic discussions, and collaborative live story highlights.",
                    color: "text-blue-400",
                    bg: "bg-blue-500/10"
                  },
                  {
                    icon: Zap,
                    title: "AI Creator Studio",
                    desc: "Smart hashtag suggestions, automatic video metadata generation, and real-time noise reduction.",
                    color: "text-pink-400",
                    bg: "bg-pink-500/10"
                  }
                ].map((pillar, i) => {
                  const Icon = pillar.icon;
                  return (
                    <div key={i} className="p-6 rounded-3xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 transition flex flex-col gap-4">
                      <div className={`w-12 h-12 rounded-2xl ${pillar.bg} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${pillar.color}`} />
                      </div>
                      <h3 className="text-lg font-bold text-white">{pillar.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{pillar.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Our Values */}
            <div className="p-8 rounded-3xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-left">
                <h3 className="text-xl font-bold text-white">Join the Creator Revolution</h3>
                <p className="text-xs text-zinc-400 max-w-lg leading-relaxed">
                  Whether you're an artist, videographer, educator, or developer, VYBE gives you the tools to grow your audience and build sustainable value.
                </p>
              </div>
              <button
                onClick={() => navigate("/signup")}
                className="px-6 py-3 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition shrink-0 cursor-pointer shadow-lg active:scale-95"
              >
                Create Free Account
              </button>
            </div>
          </div>
        )}

        {/* ================= 2. HELP & SUPPORT TAB ================= */}
        {activeTab === "help" && (
          <div className="space-y-12 animate-fadeIn max-w-4xl mx-auto">
            {/* Search Header */}
            <div className="text-center space-y-4 pt-2">
              <h1 className="text-3xl sm:text-4xl font-black text-white">How can we help you today?</h1>
              <p className="text-sm text-zinc-400">Search troubleshooting guides, safety policies, and creator FAQs.</p>

              <div className="relative max-w-xl mx-auto mt-6">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search articles e.g., verification, 2FA, contact request, monetization..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-xs text-white placeholder-zinc-500 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 transition shadow-lg"
                />
              </div>
            </div>

            {/* Quick Category Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Account & Login", count: "12 articles", cat: "Account" },
                { label: "Security & 2FA", count: "8 articles", cat: "Security" },
                { label: "Creator Monetization", count: "15 articles", cat: "Monetization" },
                { label: "Messaging & Calls", count: "10 articles", cat: "Messaging" },
                { label: "Verification Badges", count: "6 articles", cat: "Verification" },
                { label: "Safety & Reporting", count: "9 articles", cat: "Safety" },
              ].map((c, i) => (
                <button
                  key={i}
                  onClick={() => setSearchQuery(c.cat)}
                  className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-rose-500/50 hover:bg-zinc-900 text-left transition cursor-pointer group"
                >
                  <p className="text-xs font-bold text-white group-hover:text-rose-400 transition">{c.label}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{c.count}</p>
                </button>
              ))}
            </div>

            {/* FAQ Accordion List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Frequently Asked Questions</h2>
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="text-xs text-rose-400 hover:underline">
                    Clear Search
                  </button>
                )}
              </div>

              {filteredFaqs.length === 0 ? (
                <div className="p-8 text-center bg-zinc-950 rounded-2xl border border-zinc-800 text-zinc-400 text-xs">
                  No articles found matching "{searchQuery}". Try a different keyword or contact our support team below.
                </div>
              ) : (
                filteredFaqs.map((faq, idx) => {
                  const isOpen = openFaqIndex === idx;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-zinc-800/80 bg-zinc-950 overflow-hidden transition"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                        className="w-full p-4 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-zinc-900/50 transition"
                      >
                        <span className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                          <span className="text-rose-400 font-mono text-[11px] font-bold">Q{idx + 1}.</span>
                          <span>{faq.q}</span>
                        </span>
                        <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? "rotate-180 text-white" : ""}`} />
                      </button>
                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 text-xs text-zinc-300 leading-relaxed border-t border-zinc-900 bg-zinc-900/20">
                          <p>{faq.a}</p>
                          <span className="inline-block mt-3 px-2 py-0.5 rounded-md bg-zinc-800 text-[10px] text-zinc-400 font-semibold">
                            Topic: {faq.cat}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Need More Help Box */}
            <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-white">Still need assistance?</h3>
                <p className="text-xs text-zinc-400">Our dedicated creator success team is available 24/7.</p>
              </div>
              <button
                onClick={() => setShowContactModal(true)}
                className="px-5 py-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition cursor-pointer active:scale-95 shadow-md shadow-rose-500/20"
              >
                Submit Support Ticket
              </button>
            </div>
          </div>
        )}

        {/* ================= 3. PRESS & NEWSROOM TAB ================= */}
        {activeTab === "press" && (
          <div className="space-y-12 animate-fadeIn max-w-4xl mx-auto">
            {/* Press Header */}
            <div className="text-center space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold">
                <Megaphone className="w-3.5 h-3.5" />
                <span>VYBE Global Newsroom</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">Official Press & Media Resources</h1>
              <p className="text-sm text-zinc-400 max-w-xl mx-auto">
                Read the latest company announcements, product launches, and access official brand media assets.
              </p>
            </div>

            {/* Press Releases */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Latest Announcements</h2>
              <div className="space-y-3">
                {[
                  {
                    date: "August 14, 2026",
                    title: "VYBE Launches Realtime Audio Spaces & Niche Creator Guilds",
                    desc: "Introducing ultra-low latency audio spaces, community discovery channels, and decentralized moderation for high-engagement creator circles.",
                    tag: "Product Update"
                  },
                  {
                    date: "July 28, 2026",
                    title: "VYBE Unveils 2026 Creator Fund: $25M Allocated for Next-Gen Short Form Content",
                    desc: "A massive commitment to support original videographers, musicians, and independent storytellers on the platform.",
                    tag: "Creator Economy"
                  },
                  {
                    date: "June 10, 2026",
                    title: "VYBE Surpasses 10 Million Active Creators Globally",
                    desc: "Rapid international adoption across North America, Europe, and Asia Pacific highlights creator demand for privacy-first social platforms.",
                    tag: "Milestone"
                  },
                  {
                    date: "May 02, 2026",
                    title: "End-to-End Encrypted Messaging and Disappearing Story Vaults Go Live",
                    desc: "Advanced cryptographic security protocols now power all 1-on-1 direct conversations and media transfers.",
                    tag: "Security & Trust"
                  }
                ].map((item, i) => (
                  <div key={i} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-zinc-500">
                      <span>{item.date}</span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-semibold border border-rose-500/20">{item.tag}</span>
                    </div>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Brand Assets & Media Kit */}
            <div className="p-6 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-6">
              <div>
                <h3 className="text-base font-bold text-white">Brand Assets & Logos</h3>
                <p className="text-xs text-zinc-400 mt-1">Official vector logos and color palettes for press usage.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={logo} alt="VYBE" className="h-8 object-contain theme-logo-adaptive" />
                    <div>
                      <p className="text-xs font-bold text-white">Primary Wordmark (PNG/SVG)</p>
                      <p className="text-[10px] text-zinc-500">Transparent background</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = logo;
                      link.download = "vybe-logo.png";
                      link.click();
                      snackbar.success("Logo downloaded!");
                    }}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                    title="Download Logo"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={logo2} alt="VYBE Icon" className="h-8 w-8 object-contain" />
                    <div>
                      <p className="text-xs font-bold text-white">App Icon Glyph (Square)</p>
                      <p className="text-[10px] text-zinc-500">Vector glyph</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.href = logo2;
                      link.download = "vybe-icon.png";
                      link.click();
                      snackbar.success("Icon downloaded!");
                    }}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                    title="Download Icon"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Palette Hex */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-zinc-400">Official Brand Colors</p>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Rose Brand", hex: "#F43F5E", bg: "bg-rose-500" },
                    { label: "Purple Accent", hex: "#8B5CF6", bg: "bg-purple-500" },
                    { label: "Amber Gold", hex: "#F59E0B", bg: "bg-amber-500" },
                    { label: "Deep Obsidian", hex: "#09090B", bg: "bg-zinc-950" },
                  ].map((col, i) => (
                    <div
                      key={i}
                      onClick={() => handleCopy(col.hex, `hex-${i}`)}
                      className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-2 cursor-pointer hover:border-zinc-700 transition"
                      title="Click to copy hex"
                    >
                      <div className={`w-4 h-4 rounded-full ${col.bg} border border-white/20 shrink-0`} />
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-zinc-200 truncate">{col.label}</p>
                        <p className="text-[9px] font-mono text-zinc-400">{copiedKey === `hex-${i}` ? "Copied!" : col.hex}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Media Inquiries Contact */}
              <div className="pt-4 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-xs text-zinc-400">Media Inquiries: <span className="text-white font-mono font-bold">press@vybe.social</span></p>
                <button
                  onClick={() => handleCopy("press@vybe.social", "press-email")}
                  className="px-3.5 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  {copiedKey === "press-email" ? "Copied Email!" : "Copy Press Contact"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. API & DEVELOPERS TAB ================= */}
        {activeTab === "api" && (
          <div className="space-y-12 animate-fadeIn max-w-4xl mx-auto">
            {/* Developer Hero */}
            <div className="text-center space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                <Terminal className="w-3.5 h-3.5" />
                <span>VYBE Open Developer Platform</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">Build on the VYBE Graph API</h1>
              <p className="text-sm text-zinc-400 max-w-xl mx-auto">
                Integrate creator analytics, automated media publishing, realtime bot notifications, and custom webhook automations.
              </p>

              <div className="pt-2">
                <button
                  onClick={() => setShowApiTokenModal(true)}
                  className="px-5 py-2.5 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition cursor-pointer shadow-lg active:scale-95"
                >
                  Generate Sandbox API Key
                </button>
              </div>
            </div>

            {/* Interactive Code Explorer */}
            <div className="rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl">
              <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                  <span className="ml-2 text-xs font-mono font-bold text-zinc-400">api.vybe.social/v1/posts/ranked-feed</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {["curl", "javascript", "python"].map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setCodeLang(lang)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold uppercase transition cursor-pointer ${
                        codeLang === lang ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-5 font-mono text-xs overflow-x-auto text-zinc-300 relative group">
                <button
                  onClick={() => {
                    const code = codeLang === "curl"
                      ? `curl -X GET "https://api.vybe.social/v1/posts/ranked-feed" \\\n  -H "Authorization: Bearer YOUR_API_TOKEN" \\\n  -H "Content-Type: application/json"`
                      : codeLang === "javascript"
                      ? `const response = await fetch("https://api.vybe.social/v1/posts/ranked-feed", {\n  headers: { "Authorization": "Bearer YOUR_API_TOKEN" }\n});\nconst feed = await response.json();`
                      : `import requests\n\nres = requests.get(\n    "https://api.vybe.social/v1/posts/ranked-feed",\n    headers={"Authorization": "Bearer YOUR_API_TOKEN"}\n)\nfeed = res.json()`;
                    handleCopy(code, "api-code");
                  }}
                  className="absolute right-4 top-4 p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition cursor-pointer"
                  title="Copy snippet"
                >
                  {copiedKey === "api-code" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                {codeLang === "curl" && (
                  <pre className="text-emerald-400 leading-relaxed">
{`curl -X GET "https://api.vybe.social/v1/posts/ranked-feed" \\
  -H "Authorization: Bearer YOUR_API_TOKEN" \\
  -H "Content-Type: application/json"`}
                  </pre>
                )}

                {codeLang === "javascript" && (
                  <pre className="text-blue-300 leading-relaxed">
{`// Modern JavaScript (ESM / Fetch)
const response = await fetch("https://api.vybe.social/v1/posts/ranked-feed", {
  method: "GET",
  headers: {
    "Authorization": "Bearer YOUR_API_TOKEN",
    "Content-Type": "application/json"
  }
});
const { success, posts } = await response.json();
console.log("Trending Posts:", posts);`}
                  </pre>
                )}

                {codeLang === "python" && (
                  <pre className="text-amber-300 leading-relaxed">
{`# Python 3 (Requests)
import requests

url = "https://api.vybe.social/v1/posts/ranked-feed"
headers = {
    "Authorization": "Bearer YOUR_API_TOKEN",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)
data = response.json()
print("Total Posts:", len(data.get("posts", [])))`}
                  </pre>
                )}
              </div>
            </div>

            {/* Endpoints Reference Table */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-white">Core REST API Endpoints</h2>
              <div className="space-y-3">
                {[
                  { method: "GET", path: "/api/v1/user/current-user", desc: "Retrieve authenticated creator profile, follower counts, and settings." },
                  { method: "GET", path: "/api/v1/reel/get-all-reels", desc: "Query trending reels with pagination and audio track tags." },
                  { method: "POST", path: "/api/v1/post/upload", desc: "Publish image or video post with tags, music, and aspect ratio metadata." },
                  { method: "GET", path: "/api/v1/user/insights", desc: "Access creator impressions, reach breakdown, and profile visit analytics." },
                  { method: "POST", path: "/api/v1/message/send", desc: "Send direct message or automation alert to any verified chat thread." },
                ].map((ep, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold ${ep.method === "GET" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-blue-500/20 text-blue-400 border border-blue-500/30"}`}>
                        {ep.method}
                      </span>
                      <span className="text-xs font-mono font-bold text-zinc-200">{ep.path}</span>
                    </div>
                    <p className="text-xs text-zinc-400 sm:max-w-md">{ep.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= 5. CAREERS & JOBS TAB ================= */}
        {activeTab === "jobs" && (
          <div className="space-y-12 animate-fadeIn max-w-4xl mx-auto">
            {/* Careers Hero */}
            <div className="text-center space-y-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold">
                <Rocket className="w-3.5 h-3.5" />
                <span>We're Hiring Across the Globe</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-white">Shape the Future of Social Connection</h1>
              <p className="text-sm text-zinc-400 max-w-xl mx-auto">
                Join a high-velocity team of designers, engineers, and creators building a faster, more authentic social experience.
              </p>
            </div>

            {/* Benefits & Perks */}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { title: "Remote-First", desc: "Work from anywhere with top-tier asynchronous tooling and home office budget.", icon: Globe },
                { title: "Meaningful Equity", desc: "Generous stock option packages so every team member shares in our collective success.", icon: Award },
                { title: "Learning Stipend", desc: "$3,000 annual budget for books, conferences, and skill growth.", icon: Zap },
              ].map((perk, i) => {
                const Icon = perk.icon;
                return (
                  <div key={i} className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <Icon className="w-5 h-5 text-rose-500" />
                    <h3 className="text-xs font-bold text-white">{perk.title}</h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{perk.desc}</p>
                  </div>
                );
              })}
            </div>

            {/* Open Positions */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Open Roles ({JOB_LISTINGS.length})</h2>
                <span className="text-xs text-zinc-500">Updated Daily</span>
              </div>

              <div className="space-y-3">
                {JOB_LISTINGS.map((job) => (
                  <div
                    key={job.id}
                    className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{job.title}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-semibold">{job.type}</span>
                      </div>
                      <p className="text-xs text-zinc-400">{job.team} · <span className="text-rose-400 font-medium">📍 {job.location}</span></p>
                      <p className="text-[11px] text-zinc-500 pt-1 leading-relaxed max-w-xl">{job.desc}</p>
                    </div>

                    <button
                      onClick={() => setShowApplyModal(job)}
                      className="px-4 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition shrink-0 cursor-pointer shadow-sm active:scale-95"
                    >
                      Quick Apply
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* External Dedicated Careers Client Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-950/40 via-zinc-900 to-zinc-950 border border-purple-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <h3 className="text-sm font-bold text-white">Looking for the dedicated Careers Portal?</h3>
                <p className="text-xs text-zinc-400">Explore department roadmaps, university internships, and executive roles on our career portal.</p>
              </div>
              <button
                onClick={() => {
                  snackbar.info("Connecting to Dedicated VYBE Careers Portal...");
                  window.open("https://careers.vybe.social", "_blank", "noopener,noreferrer");
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition shrink-0 cursor-pointer shadow-lg shadow-purple-500/20"
              >
                <span>Visit Careers Portal</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= 6. PRIVACY POLICY TAB ================= */}
        {activeTab === "privacy" && (
          <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
            <div className="border-b border-zinc-800 pb-6 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Privacy & Data Protection Standards</span>
              </div>
              <h1 className="text-3xl font-black text-white">VYBE Privacy Policy</h1>
              <p className="text-xs text-zinc-500">Effective Date: August 15, 2026 · Compliant with GDPR, CCPA, and Global Digital Privacy Standards</p>
            </div>

            <div className="prose prose-invert prose-zinc max-w-none text-xs leading-relaxed space-y-6 text-zinc-300">
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">1. Information We Collect</h2>
                <p>When you create an account, upload media, or interact with creators on VYBE, we collect information you provide directly (such as name, username, email, phone number, bio, profile photo) and telemetry data generated automatically (device type, IP address, general approximate location, and viewing history).</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">2. How We Use Information</h2>
                <p>We use the collected information to: (a) Deliver and personalize your Reels, stories, and feed recommendations; (b) Facilitate real-time messaging and video calls; (c) Process monetization tips and payouts; (d) Detect and prevent fraud, spam, and community guideline violations; and (e) Comply with legal obligations.</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">3. Direct Messaging & End-to-End Encryption</h2>
                <p>Your direct messages are transmitted securely. Voice notes, photos, and chat interactions in 1-on-1 conversations are protected with strong cryptographic encryption standards. We do not sell your personal chat data to third-party data brokers or advertisers.</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">4. Your Data Rights & Choices</h2>
                <p>You have full ownership of your data. At any time in your Settings, you can: (a) Request a complete ZIP export of your profile, posts, and reels; (b) Switch your account to Private; (c) Manage who can send you direct messages or contact requests; and (d) Permanently delete your account and associated media.</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">5. Contact Our Data Protection Officer</h2>
                <p>For questions regarding data processing or privacy inquiries, contact our Data Protection Office at <strong className="text-white font-mono">privacy@vybe.social</strong>.</p>
              </section>
            </div>
          </div>
        )}

        {/* ================= 7. TERMS OF SERVICE TAB ================= */}
        {activeTab === "terms" && (
          <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
            <div className="border-b border-zinc-800 pb-6 space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                <FileText className="w-3.5 h-3.5" />
                <span>Legal Terms & Community Standards</span>
              </div>
              <h1 className="text-3xl font-black text-white">Terms of Service</h1>
              <p className="text-xs text-zinc-500">Last Revised: August 15, 2026</p>
            </div>

            <div className="prose prose-invert prose-zinc max-w-none text-xs leading-relaxed space-y-6 text-zinc-300">
              <section className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">1. Agreement to Terms</h2>
                <p>By accessing or using the VYBE mobile application, website, and developer APIs, you agree to be bound by these Terms of Service and our Community Guidelines. If you do not agree, you must not access or use the platform.</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">2. User Eligibility & Account Safety</h2>
                <p>You must be at least 13 years of age (or the minimum legal age in your jurisdiction) to create an account. You are responsible for safeguarding your credentials, maintaining Two-Factor Authentication, and all activities conducted through your account.</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">3. Content Ownership & Licenses</h2>
                <p>You retain full copyright and ownership of any media, photos, videos, and music you upload to VYBE. By uploading, you grant VYBE a non-exclusive, royalty-free, worldwide license to host, transcode, and display your public content solely for platform operations.</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">4. Prohibited Conduct</h2>
                <p>Users must not upload content that contains hate speech, harassment, non-consensual imagery, unauthorized copyrighted material, or malware. Automated scraping and malicious API abuse will result in immediate termination.</p>
              </section>

              <section className="space-y-2">
                <h2 className="text-sm font-bold text-white uppercase tracking-wider text-rose-400">5. Limitation of Liability & Termination</h2>
                <p>VYBE is provided on an "AS IS" and "AS AVAILABLE" basis. We reserve the right to suspend or terminate accounts that violate community safety or security standards.</p>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Global Footer */}
      <footer className="border-t border-zinc-900 bg-black/60 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <img src={logo} alt="VYBE" className="h-5 object-contain theme-logo-adaptive" />
            <span>© 2026 VYBE Inc. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabChange(t.id)}
                className={`hover:text-zinc-300 transition cursor-pointer ${activeTab === t.id ? "text-white font-bold" : ""}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </footer>

      {/* CONTACT / SUPPORT TICKET MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <LifeBuoy className="w-5 h-5 text-rose-500" />
                <span>Submit Support Ticket</span>
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTicketSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={ticketForm.name}
                  onChange={(e) => setTicketForm({ ...ticketForm, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={ticketForm.email}
                  onChange={(e) => setTicketForm({ ...ticketForm, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Issue Category</label>
                  <select
                    value={ticketForm.category}
                    onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option>Account & Login</option>
                    <option>Security & 2FA</option>
                    <option>Creator Monetization</option>
                    <option>Reels & Uploads</option>
                    <option>Bug Report</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Priority</label>
                  <select
                    value={ticketForm.priority}
                    onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option>Normal</option>
                    <option>High</option>
                    <option>Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Message / Issue Details</label>
                <textarea
                  required
                  rows={3}
                  value={ticketForm.message}
                  onChange={(e) => setTicketForm({ ...ticketForm, message: e.target.value })}
                  placeholder="Please describe the issue in detail..."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-rose-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={ticketSubmitting}
                  className="px-5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {ticketSubmitting ? "Submitting..." : "Send Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK JOB APPLY MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Apply for Role</h3>
                <p className="text-xs text-rose-400 font-medium">{showApplyModal.title}</p>
              </div>
              <button
                onClick={() => setShowApplyModal(null)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleJobSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={jobForm.name}
                  onChange={(e) => setJobForm({ ...jobForm, name: e.target.value })}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={jobForm.email}
                  onChange={(e) => setJobForm({ ...jobForm, email: e.target.value })}
                  placeholder="alex@domain.com"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Resume / LinkedIn URL</label>
                <input
                  type="url"
                  required
                  value={jobForm.resumeUrl}
                  onChange={(e) => setJobForm({ ...jobForm, resumeUrl: e.target.value })}
                  placeholder="https://linkedin.com/in/yourprofile or Google Drive link"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Portfolio / GitHub / Work Sample (Optional)</label>
                <input
                  type="url"
                  value={jobForm.portfolioUrl}
                  onChange={(e) => setJobForm({ ...jobForm, portfolioUrl: e.target.value })}
                  placeholder="https://github.com/yourhandle"
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">Short Note / Why VYBE?</label>
                <textarea
                  rows={2}
                  value={jobForm.note}
                  onChange={(e) => setJobForm({ ...jobForm, note: e.target.value })}
                  placeholder="Tell us what excites you about this role..."
                  className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={jobSubmitting}
                  className="px-5 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50"
                >
                  {jobSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATE SANDBOX API KEY MODAL */}
      {showApiTokenModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Code className="w-5 h-5 text-blue-400" />
                <span>Developer Sandbox Credentials</span>
              </h3>
              <button
                onClick={() => {
                  setShowApiTokenModal(false);
                  setGeneratedApiKey(null);
                }}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {generatedApiKey ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Sandbox API Key Ready!</span>
                  </p>
                  <p className="text-[11px] text-zinc-400">Use this token in your HTTP Authorization header for sandbox API calls.</p>
                </div>

                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl font-mono text-xs text-white flex items-center justify-between gap-2">
                  <span className="truncate">{generatedApiKey}</span>
                  <button
                    onClick={() => handleCopy(generatedApiKey, "sandbox-key")}
                    className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white shrink-0"
                    title="Copy Key"
                  >
                    {copiedKey === "sandbox-key" ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setShowApiTokenModal(false);
                    setGeneratedApiKey(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:bg-zinc-200 transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleGenerateApiKey} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Application Name</label>
                  <input
                    type="text"
                    required
                    value={apiForm.appName}
                    onChange={(e) => setApiForm({ ...apiForm, appName: e.target.value })}
                    placeholder="e.g. CreatorAnalyticsBot"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Developer Email</label>
                  <input
                    type="email"
                    required
                    value={apiForm.email}
                    onChange={(e) => setApiForm({ ...apiForm, email: e.target.value })}
                    placeholder="dev@company.com"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-zinc-400 block mb-1">Primary Integration Purpose</label>
                  <select
                    value={apiForm.useCase}
                    onChange={(e) => setApiForm({ ...apiForm, useCase: e.target.value })}
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option>Analytics & Creator Insights</option>
                    <option>Automated Post & Reel Publishing</option>
                    <option>Chat Bot & Webhook Notifications</option>
                    <option>Custom Community Client</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowApiTokenModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs transition cursor-pointer"
                  >
                    Create Sandbox Key
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanyHub;
