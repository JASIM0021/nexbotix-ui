import { useState, useEffect } from 'react';
import {
  Globe, Mail, CheckCircle2, AlertCircle, RefreshCw, Copy, Check,
  Plus, Trash2, KeyRound, ChevronDown, ChevronUp,
  Loader2, Zap, HelpCircle, X, ArrowRight, Inbox
} from 'lucide-react';
import { apiFetch, API_ENDPOINTS } from '@/config/api';
import { useNavigate } from 'react-router-dom';

interface DomainRecord {
  id: string;
  domain: string;
  isVerified: boolean;
  dkimSelector: string;
  dkimPublicKey: string;
  spfRecord: string;
  mxRecord: string;
  dnsStatus?: {
    mxValid: boolean;
    spfValid: boolean;
    dkimValid: boolean;
    dmarcValid: boolean;
    details: string;
    lastChecked: string;
  };
  createdAt: string;
}

interface MailboxRecord {
  id: string;
  domainId: string;
  domain: string;
  username: string;
  email: string;
  status: string;
  isSendOnly?: boolean;
  createdAt: string;
}

interface MailboxQuota {
  domainsCount: number;
  mailboxesUsed: number;
  mailboxesLimit: number;
  canCreateMore: boolean;
  hasServiceAccess: boolean;
  mailServerHost: string;
  serverIP: string;
}

export function DomainEmailPage({ isPaid }: { isPaid?: boolean }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [domains, setDomains] = useState<DomainRecord[]>([]);
  const [mailboxes, setMailboxes] = useState<MailboxRecord[]>([]);
  const [quota, setQuota] = useState<MailboxQuota | null>(null);
  const [expandedDomainId, setExpandedDomainId] = useState<string | null>(null);

  // Modals
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [domainSubmitting, setDomainSubmitting] = useState(false);

  const [addMailboxOpen, setAddMailboxOpen] = useState(false);
  const [mailboxDomainId, setMailboxDomainId] = useState('');
  const [mailboxUser, setMailboxUser] = useState('');
  const [mailboxPwd, setMailboxPwd] = useState('');
  const [mailboxIsSendOnly, setMailboxIsSendOnly] = useState(false);
  const [mailboxSubmitting, setMailboxSubmitting] = useState(false);
  const [togglingSendOnlyId, setTogglingSendOnlyId] = useState<string | null>(null);

  const [resetPwdOpen, setResetPwdOpen] = useState(false);
  const [activeMailbox, setActiveMailbox] = useState<MailboxRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  const [clientConfigOpen, setClientConfigOpen] = useState(false);
  const [configMailbox, setConfigMailbox] = useState<MailboxRecord | null>(null);

  const [verifyingDomainId, setVerifyingDomainId] = useState<string | null>(null);
  const [connectingMailboxId, setConnectingMailboxId] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeSenderEmail, setActiveSenderEmail] = useState<string | null>(null);

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatDKIMRecordValue = (val: string) => {
    if (!val) return 'Generating key...';
    const clean = val.trim();
    if (clean.startsWith('v=DKIM1')) {
      return clean;
    }
    return `v=DKIM1; h=sha256; k=rsa; p=${clean}`;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [resQuota, resDomains, resMailboxes, resSmtp] = await Promise.allSettled([
        apiFetch(API_ENDPOINTS.email.mailboxQuota),
        apiFetch(API_ENDPOINTS.email.domains),
        apiFetch(API_ENDPOINTS.email.mailboxes),
        apiFetch(API_ENDPOINTS.email.smtp),
      ]);

      if (resQuota.status === 'fulfilled') {
        const dataQuota = await resQuota.value.json();
        if (dataQuota.success && dataQuota.data) setQuota(dataQuota.data);
      }
      if (resDomains.status === 'fulfilled') {
        const dataDomains = await resDomains.value.json();
        if (dataDomains.success && dataDomains.data) {
          setDomains(dataDomains.data);
          if (dataDomains.data.length > 0 && !expandedDomainId) {
            setExpandedDomainId(dataDomains.data[0].id);
          }
        }
      }
      if (resMailboxes.status === 'fulfilled') {
        const dataMailboxes = await resMailboxes.value.json();
        if (dataMailboxes.success && dataMailboxes.data) setMailboxes(dataMailboxes.data);
      }
      if (resSmtp.status === 'fulfilled') {
        const dataSmtp = await resSmtp.value.json();
        if (dataSmtp.success && dataSmtp.data) {
          setActiveSenderEmail(dataSmtp.data.senderEmail || dataSmtp.data.username || null);
        }
      }
    } catch {
      setBannerMsg({ text: 'Failed to load domain email data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setDomainSubmitting(true);
    setBannerMsg(null);
    try {
      const res = await apiFetch(API_ENDPOINTS.email.domains, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setDomains(prev => [data.data, ...prev]);
        setExpandedDomainId(data.data.id);
        setNewDomain('');
        setAddDomainOpen(false);
        setBannerMsg({ text: `Domain ${data.data.domain} registered! Please configure your DNS records below.`, type: 'success' });
        loadData();
      } else {
        setBannerMsg({ text: data.error || 'Failed to add domain.', type: 'error' });
      }
    } catch {
      setBannerMsg({ text: 'Error connecting to server.', type: 'error' });
    } finally {
      setDomainSubmitting(false);
    }
  };

  const handleVerifyDomain = async (domainId: string) => {
    setVerifyingDomainId(domainId);
    setBannerMsg(null);
    try {
      const res = await apiFetch(API_ENDPOINTS.email.verifyDomain(domainId), { method: 'POST' });
      const data = await res.json();
      if (data.success && data.data) {
        setDomains(prev => prev.map(d => (d.id === domainId ? data.data : d)));
        if (data.data.isVerified) {
          setBannerMsg({ text: `All DNS records verified successfully for ${data.data.domain}!`, type: 'success' });
        } else {
          setBannerMsg({ text: `DNS check completed: ${data.data.dnsStatus?.details || 'Some records are still propagating.'}`, type: 'error' });
        }
      } else {
        setBannerMsg({ text: data.error || 'Verification check failed.', type: 'error' });
      }
    } catch {
      setBannerMsg({ text: 'Network error verifying domain.', type: 'error' });
    } finally {
      setVerifyingDomainId(null);
    }
  };

  const handleDeleteDomain = async (domainId: string, domainName: string) => {
    if (!confirm(`Are you sure you want to remove ${domainName}? Any associated mailboxes will also be deleted.`)) {
      return;
    }
    try {
      const res = await apiFetch(API_ENDPOINTS.email.domain(domainId), { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDomains(prev => prev.filter(d => d.id !== domainId));
        setMailboxes(prev => prev.filter(m => m.domainId !== domainId));
        setBannerMsg({ text: `Domain ${domainName} deleted.`, type: 'success' });
        loadData();
      } else {
        setBannerMsg({ text: data.error || 'Failed to delete domain.', type: 'error' });
      }
    } catch {
      setBannerMsg({ text: 'Error deleting domain.', type: 'error' });
    }
  };

  const handleAddMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailboxDomainId || !mailboxUser.trim()) return;
    setMailboxSubmitting(true);
    setBannerMsg(null);
    try {
      const res = await apiFetch(API_ENDPOINTS.email.mailboxes, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domainId: mailboxDomainId,
          username: mailboxUser.trim(),
          password: mailboxPwd.trim(),
          isSendOnly: mailboxIsSendOnly,
        }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setMailboxes(prev => [data.data, ...prev]);
        setMailboxUser('');
        setMailboxPwd('');
        setMailboxIsSendOnly(false);
        setAddMailboxOpen(false);
        setBannerMsg({
          text: `Mailbox ${data.data.email} created successfully${data.data.isSendOnly ? ' (Send-Only)' : ' (Send & Receive)'}!`,
          type: 'success'
        });
        loadData();
      } else {
        setBannerMsg({ text: data.error || 'Failed to create mailbox.', type: 'error' });
      }
    } catch {
      setBannerMsg({ text: 'Error creating mailbox.', type: 'error' });
    } finally {
      setMailboxSubmitting(false);
    }
  };

  const handleToggleSendOnly = async (mailbox: MailboxRecord) => {
    setTogglingSendOnlyId(mailbox.id);
    setBannerMsg(null);
    const targetState = !mailbox.isSendOnly;
    try {
      const res = await apiFetch(API_ENDPOINTS.email.mailboxSendOnly(mailbox.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSendOnly: targetState }),
      });
      const data = await res.json();
      if (data.success) {
        setMailboxes(prev => prev.map(m => m.id === mailbox.id ? { ...m, isSendOnly: targetState } : m));
        setBannerMsg({
          text: `${mailbox.email} is now ${targetState ? 'Send-Only (inbox receiving disabled)' : 'Send & Receive (inbox receiving enabled)'}.`,
          type: 'success',
        });
      } else {
        setBannerMsg({ text: data.error || 'Failed to update send-only setting.', type: 'error' });
      }
    } catch {
      setBannerMsg({ text: 'Error connecting to server.', type: 'error' });
    } finally {
      setTogglingSendOnlyId(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMailbox || !newPassword.trim()) return;
    setPwdSubmitting(true);
    setBannerMsg(null);
    try {
      const res = await apiFetch(API_ENDPOINTS.email.mailboxPassword(activeMailbox.id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setResetPwdOpen(false);
        setNewPassword('');
        setActiveMailbox(null);
        setBannerMsg({ text: `Password updated for ${activeMailbox.email}`, type: 'success' });
      } else {
        setBannerMsg({ text: data.error || 'Failed to update password.', type: 'error' });
      }
    } catch {
      setBannerMsg({ text: 'Error updating password.', type: 'error' });
    } finally {
      setPwdSubmitting(false);
    }
  };

  const handleDeleteMailbox = async (mailboxId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete mailbox ${email}? All emails stored in this box will be purged.`)) {
      return;
    }
    try {
      const res = await apiFetch(API_ENDPOINTS.email.mailbox(mailboxId), { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMailboxes(prev => prev.filter(m => m.id !== mailboxId));
        setBannerMsg({ text: `Mailbox ${email} removed.`, type: 'success' });
        loadData();
      } else {
        setBannerMsg({ text: data.error || 'Failed to delete mailbox.', type: 'error' });
      }
    } catch {
      setBannerMsg({ text: 'Error deleting mailbox.', type: 'error' });
    }
  };

  const handleConnectSMTP = async (mailbox: MailboxRecord) => {
    setConnectingMailboxId(mailbox.id);
    setBannerMsg(null);
    try {
      const res = await apiFetch(API_ENDPOINTS.email.mailboxConnectSMTP(mailbox.id), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setActiveSenderEmail(mailbox.email);
        setBannerMsg({
          text: `🎉 Success! ${mailbox.email} is now connected as your active Nexbotix Sender SMTP. You can send campaigns immediately!`,
          type: 'success',
        });
      } else {
        setBannerMsg({ text: data.error || 'Failed to connect mailbox to SMTP.', type: 'error' });
      }
    } catch {
      setBannerMsg({ text: 'Error connecting mailbox to SMTP.', type: 'error' });
    } finally {
      setConnectingMailboxId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400 gap-3">
        <Loader2 size={30} className="animate-spin text-blue-600" />
        <p className="text-sm font-medium text-gray-500">Loading custom domain email services...</p>
      </div>
    );
  }

  const serverHost = quota?.mailServerHost || 'mail.nexbotix.online';
  const isUnlimitedAdmin = quota?.mailboxesLimit === 100;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Page Header & Actions ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <Globe className="text-blue-600" size={24} />
            Custom Domain Business Email
          </h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">
            Host professional email mailboxes on your own custom domain with DKIM, SPF & DMARC deliverability.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setAddDomainOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition-all"
          >
            <Plus size={15} />
            <span>Add Custom Domain</span>
          </button>
          {domains.length > 0 && (
            <button
              onClick={() => {
                if (domains.length > 0) setMailboxDomainId(domains[0].id);
                setAddMailboxOpen(true);
              }}
              disabled={!quota?.canCreateMore}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Mail size={15} />
              <span>Create Mailbox</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Banner message ── */}
      {bannerMsg && (
        <div
          className={`flex items-start justify-between p-3.5 rounded-xl border text-xs sm:text-sm shadow-sm ${
            bannerMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {bannerMsg.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-red-600 shrink-0" />
            )}
            <span className="font-medium">{bannerMsg.text}</span>
          </div>
          <button onClick={() => setBannerMsg(null)} className="text-gray-400 hover:text-gray-600 ml-2">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Sleek KPI Overview Grid (Clean, User-Facing, No DevOps Jargon) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Mailboxes Capacity */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Mailbox Capacity</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold text-gray-900">{quota?.mailboxesUsed || 0}</span>
              <span className="text-xs font-medium text-gray-500">
                {isUnlimitedAdmin ? '/ Unlimited' : `/ ${quota?.mailboxesLimit || 5} included`}
              </span>
            </div>
            {!isUnlimitedAdmin && (
              <div className="w-40 bg-gray-100 rounded-full h-2 mt-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (((quota?.mailboxesUsed || 0) / (quota?.mailboxesLimit || 5)) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Mail size={20} />
          </div>
        </div>

        {/* Connected Domains */}
        <div className="p-5 rounded-2xl bg-white border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Connected Domains</p>
            <div className="flex items-baseline gap-2 mt-1.5">
              <span className="text-2xl font-bold text-gray-900">{domains.length}</span>
              <span className="text-xs font-medium text-emerald-600">
                ({domains.filter(d => d.isVerified).length} verified)
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              {domains.length === 0 ? 'No domains connected' : 'Ready for custom business email'}
            </p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Globe size={20} />
          </div>
        </div>
      </div>

      {/* Upgrade CTA if not active */}
      {quota && !quota.hasServiceAccess && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Zap size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Unlock Custom Business Email</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                Host custom business mailboxes on your domain with full DKIM security & 1-Click Nexbotix Sender connection for ₹199/mo.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/subscription')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm transition-all"
          >
            <span>View Pricing & Upgrade</span>
            <ArrowRight size={13} />
          </button>
        </div>
      )}

      {/* ── Domains Section ── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <span>Your Custom Domains</span>
            <span className="text-xs text-gray-500 font-semibold px-2 py-0.5 bg-gray-100 rounded-full">
              {domains.length}
            </span>
          </h2>
        </div>

        {domains.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <Globe size={24} />
            </div>
            <p className="text-sm font-bold text-gray-900">No domains registered yet</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Add your domain (e.g. <code>mycompany.com</code>) to automatically generate DKIM keys and view the DNS setup instructions.
            </p>
            <button
              onClick={() => setAddDomainOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
            >
              <Plus size={14} />
              <span>Add Your First Domain</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map(d => {
              const isExpanded = expandedDomainId === d.id;
              const isVerifying = verifyingDomainId === d.id;

              return (
                <div key={d.id} className="rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden transition-all">
                  {/* Domain Header Row */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <Globe size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-bold text-gray-900 text-base">{d.domain}</span>
                          {d.isVerified ? (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                              <CheckCircle2 size={12} /> Verified
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <AlertCircle size={12} /> DNS Setup Required
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Added {new Date(d.createdAt).toLocaleDateString()}
                          {d.dnsStatus?.lastChecked && ` • Last checked ${new Date(d.dnsStatus.lastChecked).toLocaleTimeString()}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerifyDomain(d.id)}
                        disabled={isVerifying}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 transition-colors disabled:opacity-50"
                        title="Query live DNS records"
                      >
                        <RefreshCw size={13} className={isVerifying ? 'animate-spin text-blue-600' : 'text-gray-500'} />
                        <span>{isVerifying ? 'Checking DNS...' : 'Verify DNS'}</span>
                      </button>

                      <button
                        onClick={() => setExpandedDomainId(isExpanded ? null : d.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                      >
                        <span>DNS Guide</span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      <button
                        onClick={() => handleDeleteDomain(d.id, d.domain)}
                        className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete domain"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* DNS Instructions Expandable Panel */}
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-gray-100 bg-gray-50/70 space-y-3.5">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                        <p className="font-semibold text-gray-800">
                          Add these 4 DNS records at your domain registrar (GoDaddy, Cloudflare, Namecheap, etc.):
                        </p>
                        <span className="text-gray-500 font-medium">DNS changes typically take 2–15 minutes</span>
                      </div>

                      <div className="space-y-2.5">
                        {/* MX Record */}
                        <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-purple-50 text-purple-700 border border-purple-100">
                              MX
                            </span>
                            <div>
                              <p className="text-xs text-gray-500">
                                Host: <span className="font-bold text-gray-900 font-mono">@</span> • Priority: <span className="font-bold text-gray-900 font-mono">10</span>
                              </p>
                              <p className="text-xs font-mono font-semibold text-gray-900 mt-0.5">
                                {d.mxRecord || serverHost}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {d.dnsStatus && (
                              <span
                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                  d.dnsStatus.mxValid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {d.dnsStatus.mxValid ? 'Active' : 'Missing'}
                              </span>
                            )}
                            <button
                              onClick={() => copyToClipboard(`mx-${d.id}`, d.mxRecord || serverHost)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                            >
                              {copiedKey === `mx-${d.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              <span>{copiedKey === `mx-${d.id}` ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>

                        {/* SPF Record */}
                        <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-100">
                              TXT
                            </span>
                            <div>
                              <p className="text-xs text-gray-500">
                                Host: <span className="font-bold text-gray-900 font-mono">@</span> (SPF Authentication)
                              </p>
                              <p className="text-xs font-mono font-semibold text-gray-900 mt-0.5 break-all">
                                {d.spfRecord}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {d.dnsStatus && (
                              <span
                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                  d.dnsStatus.spfValid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {d.dnsStatus.spfValid ? 'Active' : 'Missing'}
                              </span>
                            )}
                            <button
                              onClick={() => copyToClipboard(`spf-${d.id}`, d.spfRecord)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                            >
                              {copiedKey === `spf-${d.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              <span>{copiedKey === `spf-${d.id}` ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>

                        {/* DKIM Record */}
                        <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-amber-50 text-amber-700 border border-amber-100 shrink-0">
                              TXT
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs text-gray-500">
                                Host: <span className="font-bold text-gray-900 font-mono">mail._domainkey</span> (DKIM Signature)
                              </p>
                              <p className="text-xs font-mono font-semibold text-gray-900 mt-0.5 truncate max-w-md sm:max-w-xl">
                                {formatDKIMRecordValue(d.dkimPublicKey)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            {d.dnsStatus && (
                              <span
                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                  d.dnsStatus.dkimValid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {d.dnsStatus.dkimValid ? 'Active' : 'Missing'}
                              </span>
                            )}
                            <button
                              onClick={() =>
                                copyToClipboard(`dkim-${d.id}`, formatDKIMRecordValue(d.dkimPublicKey))
                              }
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                            >
                              {copiedKey === `dkim-${d.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              <span>{copiedKey === `dkim-${d.id}` ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>

                        {/* DMARC Record */}
                        <div className="p-3.5 rounded-xl bg-white border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-teal-50 text-teal-700 border border-teal-100">
                              TXT
                            </span>
                            <div>
                              <p className="text-xs text-gray-500">
                                Host: <span className="font-bold text-gray-900 font-mono">_dmarc</span>
                              </p>
                              <p className="text-xs font-mono font-semibold text-gray-900 mt-0.5">
                                v=DMARC1; p=none; sp=none;
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            {d.dnsStatus && (
                              <span
                                className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                                  d.dnsStatus.dmarcValid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : 'bg-red-50 text-red-700 border border-red-200'
                                }`}
                              >
                                {d.dnsStatus.dmarcValid ? 'Active' : 'Missing'}
                              </span>
                            )}
                            <button
                              onClick={() => copyToClipboard(`dmarc-${d.id}`, 'v=DMARC1; p=none; sp=none;')}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                            >
                              {copiedKey === `dmarc-${d.id}` ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                              <span>{copiedKey === `dmarc-${d.id}` ? 'Copied' : 'Copy'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Mailboxes Section ── */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Mail className="text-blue-600" size={18} />
              <span>Provisioned Mailboxes</span>
              <span className="text-xs text-gray-500 font-semibold px-2 py-0.5 bg-gray-100 rounded-full">
                {mailboxes.length}
              </span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Live inboxes on your custom domain. Connect them directly to Nexbotix Sender with 1-click.
            </p>
          </div>

          {domains.length > 0 && (
            <button
              onClick={() => {
                setMailboxDomainId(domains[0].id);
                setAddMailboxOpen(true);
              }}
              disabled={!quota?.canCreateMore}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Plus size={14} />
              <span>Create Mailbox</span>
            </button>
          )}
        </div>

        {mailboxes.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-gray-200 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto text-gray-400">
              <Mail size={24} />
            </div>
            <p className="text-sm font-bold text-gray-900">No mailboxes created yet</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              Create your custom business email addresses (e.g. <code>support@{domains[0]?.domain || 'yourdomain.com'}</code>).
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mailboxes.map(m => {
              const isConnecting = connectingMailboxId === m.id;
              const isCurrentSender = activeSenderEmail?.toLowerCase() === m.email.toLowerCase();

              return (
                <div
                  key={m.id}
                  className={`p-5 rounded-2xl bg-white border shadow-sm flex flex-col justify-between gap-4 transition-all ${
                    isCurrentSender ? 'border-emerald-300 ring-1 ring-emerald-300/60' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-sm ${
                        isCurrentSender ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      }`}>
                        {m.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 font-mono break-all">{m.email}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                          {m.isSendOnly ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200" title="This mailbox only sends emails; incoming mail is not received in the inbox">
                              Send Only
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200" title="Can send emails and receive incoming emails in your inbox">
                              Send & Receive
                            </span>
                          )}
                          {isCurrentSender && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1">
                              <CheckCircle2 size={10} className="text-indigo-600" /> Active Sender
                            </span>
                          )}
                          <span className="text-[11px] text-gray-400">
                            Created {new Date(m.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setActiveMailbox(m);
                          setResetPwdOpen(true);
                        }}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Reset mailbox password"
                      >
                        <KeyRound size={15} />
                      </button>
                      <button
                        onClick={() => handleDeleteMailbox(m.id, m.email)}
                        className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete mailbox"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2.5">
                      {isCurrentSender ? (
                        <div className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-sm">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Connected to Nexbotix Sender</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleConnectSMTP(m)}
                          disabled={isConnecting}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition-all disabled:opacity-50"
                        >
                          <Zap size={13} className={isConnecting ? 'animate-bounce text-amber-300' : 'text-amber-300 fill-amber-300'} />
                          <span>{isConnecting ? 'Connecting Sender...' : 'Connect to Nexbotix Sender'}</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setConfigMailbox(m);
                          setClientConfigOpen(true);
                        }}
                        className="p-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 border border-gray-200 transition-colors"
                        title="View IMAP / SMTP client setup instructions"
                      >
                        <HelpCircle size={15} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-gray-100 text-xs">
                      <button
                        type="button"
                        onClick={() => handleToggleSendOnly(m)}
                        disabled={togglingSendOnlyId === m.id}
                        className="text-[11px] font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1 disabled:opacity-50 transition-colors"
                        title={m.isSendOnly ? 'Allow incoming email reception into Nexbotix Inbox' : 'Disable incoming email reception (outgoing only)'}
                      >
                        {togglingSendOnlyId === m.id && <Loader2 size={11} className="animate-spin" />}
                        <span>{m.isSendOnly ? 'Switch to Send & Receive' : 'Switch to Send-Only'}</span>
                      </button>

                      {!m.isSendOnly && (
                        <button
                          type="button"
                          onClick={() => navigate(`/email?tab=inbox&mailbox=${encodeURIComponent(m.email)}`)}
                          className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
                        >
                          <Inbox size={12} />
                          <span>View Inbox</span>
                          <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: Add Custom Domain ── */}
      {addDomainOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Globe size={18} className="text-blue-600" />
                Add Custom Domain
              </h3>
              <button onClick={() => setAddDomainOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Domain Name (Root domain or subdomain)
                </label>
                <input
                  type="text"
                  placeholder="e.g. brand.com or mail.brand.com"
                  value={newDomain}
                  onChange={e => setNewDomain(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-[11px] text-gray-500 mt-1.5">
                  Upon adding, secure DKIM keys are automatically generated for your domain.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddDomainOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={domainSubmitting || !newDomain.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {domainSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Add Domain</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add Mailbox ── */}
      {addMailboxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Mail size={18} className="text-blue-600" />
                Create Business Mailbox
              </h3>
              <button onClick={() => setAddMailboxOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddMailbox} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Domain</label>
                <select
                  value={mailboxDomainId}
                  onChange={e => setMailboxDomainId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {domains.map(d => (
                    <option key={d.id} value={d.id}>
                      @{d.domain} {d.isVerified ? '✓' : '(unverified)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Username / Prefix</label>
                <div className="flex items-center rounded-xl bg-white border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
                  <input
                    type="text"
                    placeholder="support, hello, sales"
                    value={mailboxUser}
                    onChange={e => setMailboxUser(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 bg-transparent text-gray-900 placeholder-gray-400 text-sm focus:outline-none"
                    required
                  />
                  <span className="px-3 text-xs text-gray-500 font-mono bg-gray-50 py-2.5 border-l border-gray-200">
                    @{domains.find(d => d.id === mailboxDomainId)?.domain || 'domain.com'}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Password (optional, auto-generated if left blank)
                </label>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  value={mailboxPwd}
                  onChange={e => setMailboxPwd(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Send-only checkbox */}
              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3.5 transition-colors">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mailboxIsSendOnly}
                    onChange={e => setMailboxIsSendOnly(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-gray-900">
                      This mail is only for sending
                    </span>
                    <span className="block text-[11px] text-gray-500 leading-normal mt-0.5">
                      {mailboxIsSendOnly
                        ? 'Outgoing only. Incoming emails will not be routed to your inbox.'
                        : 'Unchecked: incoming emails sent to this address will be received in your Nexbotix Inbox.'}
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAddMailboxOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mailboxSubmitting || !mailboxUser.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {mailboxSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Create Mailbox</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Reset Password ── */}
      {resetPwdOpen && activeMailbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <KeyRound size={18} className="text-amber-600" />
                Reset Mailbox Password
              </h3>
              <button onClick={() => setResetPwdOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Updating password for <strong className="text-gray-900 font-mono">{activeMailbox.email}</strong>.
            </p>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password</label>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetPwdOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pwdSubmitting || newPassword.length < 8}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-sm transition-all disabled:opacity-50"
                >
                  {pwdSubmitting && <Loader2 size={13} className="animate-spin" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Email Client Setup Instructions ── */}
      {clientConfigOpen && configMailbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-gray-200 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Mail size={18} className="text-blue-600" />
                Email Client Setup (Outlook, Apple Mail, Thunderbird)
              </h3>
              <button onClick={() => setClientConfigOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-gray-500">
              Connect <strong className="text-gray-900 font-mono">{configMailbox.email}</strong> to any mobile or desktop email application using these settings:
            </p>

            <div className="space-y-3">
              {/* IMAP Incoming */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Incoming Mail (IMAP)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Server:</span> <code className="text-gray-900 font-mono font-semibold">{serverHost}</code>
                  </div>
                  <div>
                    <span className="text-gray-500">Port:</span> <code className="text-gray-900 font-mono font-semibold">993 (SSL/TLS)</code>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Username:</span> <code className="text-gray-900 font-mono font-semibold">{configMailbox.email}</code>
                  </div>
                </div>
              </div>

              {/* SMTP Outgoing */}
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-2">
                <p className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Outgoing Mail (SMTP)</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Server:</span> <code className="text-gray-900 font-mono font-semibold">{serverHost}</code>
                  </div>
                  <div>
                    <span className="text-gray-500">Port:</span> <code className="text-gray-900 font-mono font-semibold">587 (STARTTLS) or 465 (SSL)</code>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Username:</span> <code className="text-gray-900 font-mono font-semibold">{configMailbox.email}</code>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setClientConfigOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
