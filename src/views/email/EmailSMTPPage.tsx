import { useState, useEffect } from 'react';
import {
  Settings2, Wifi, WifiOff, Eye, EyeOff, Loader2, CheckCircle2,
  AlertCircle, HelpCircle, FileText, Upload, X, Code2, KeyRound,
  Zap, Mail, ArrowRight
} from 'lucide-react';
import { apiFetch, API_ENDPOINTS } from '@/config/api';
import { EmailAPIPlayground } from './EmailAPIPlayground';

interface SMTPConfig {
  id?: string;
  host: string;
  port: number;
  username: string;
  senderName: string;
  senderEmail: string;
  useTLS: boolean;
  isVerified: boolean;
  signature: string;
  deckURL: string;
  deckName: string;
  autoAttachSignature: boolean;
  autoAttachDeck: boolean;
  provider?: string;
}

interface InhouseMailbox {
  id: string;
  domainId: string;
  domain: string;
  email: string;
  username: string;
  status: string;
  createdAt: string;
}

const PRESETS: Record<string, { host: string; port: number; useTLS: boolean; label: string }> = {
  nexbotix: { host: 'mail.nexbotix.online', port: 465, useTLS: true,  label: '⚡ Nexbotix In-House Email' },
  gmail:    { host: 'smtp.gmail.com',       port: 587, useTLS: false, label: 'Gmail (App Password)' },
  outlook:  { host: 'smtp.office365.com',   port: 587, useTLS: false, label: 'Outlook / Office 365' },
  yahoo:    { host: 'smtp.mail.yahoo.com',  port: 587, useTLS: false, label: 'Yahoo Mail' },
  zoho:     { host: 'smtp.zoho.com',        port: 465, useTLS: true,  label: 'Zoho Mail' },
  hostinger: { host: 'hostinger-api',      port: 0,   useTLS: false, label: 'Hostinger API' },
  custom:   { host: '',                     port: 587, useTLS: false, label: 'Custom SMTP' },
};

export function EmailSMTPPage({ isPaid }: { isPaid: boolean }) {
  const [form, setForm] = useState({
    host: '', port: 587, username: '', password: '', senderName: '', senderEmail: '', useTLS: false,
    signature: '', deckURL: '', deckName: '', autoAttachSignature: false, autoAttachDeck: false,
  });
  const [showPwd, setShowPwd] = useState(false);
  const [sigView, setSigView] = useState<'code' | 'preview'>('code');
  const [preset, setPreset] = useState('gmail');
  const [saved, setSaved] = useState<SMTPConfig | null>(null);
  const [inhouseMailboxes, setInhouseMailboxes] = useState<InhouseMailbox[]>([]);
  const [connectingMailboxId, setConnectingMailboxId] = useState<string | null>(null);
  const [selectedInhouseMailbox, setSelectedInhouseMailbox] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [uploadingDeck, setUploadingDeck] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => { if (isPaid) load(); }, [isPaid]);

  const load = async () => {
    try {
      const [rSmtp, rMb] = await Promise.allSettled([
        apiFetch(API_ENDPOINTS.email.smtp),
        apiFetch(API_ENDPOINTS.email.mailboxes),
      ]);

      let mailboxesList: InhouseMailbox[] = [];
      if (rMb.status === 'fulfilled') {
        const mbData = await rMb.value.json();
        if (mbData.success && Array.isArray(mbData.data)) {
          mailboxesList = mbData.data;
          setInhouseMailboxes(mbData.data);
          if (mbData.data.length > 0) {
            setSelectedInhouseMailbox(mbData.data[0].email);
          }
        }
      }

      if (rSmtp.status === 'fulfilled') {
        const d = await rSmtp.value.json();
        if (d.success && d.data) {
          setSaved(d.data);
          setForm(f => ({
            ...f,
            host: d.data.host,
            port: d.data.port,
            username: d.data.username,
            senderName: d.data.senderName,
            senderEmail: d.data.senderEmail,
            useTLS: d.data.useTLS,
            signature: d.data.signature || '',
            deckURL: d.data.deckURL || '',
            deckName: d.data.deckName || '',
            autoAttachSignature: !!d.data.autoAttachSignature,
            autoAttachDeck: !!d.data.autoAttachDeck,
          }));

          const isInhouse = (d.data.provider === 'nexbotix') ||
            mailboxesList.some(m => m.email.toLowerCase() === (d.data.username || '').toLowerCase() || m.email.toLowerCase() === (d.data.senderEmail || '').toLowerCase());

          if (isInhouse) {
            setPreset('nexbotix');
            setSelectedInhouseMailbox(d.data.username || d.data.senderEmail);
          } else if (d.data.host === 'hostinger-api') {
            setPreset('hostinger');
          } else {
            const matching = Object.entries(PRESETS).find(([k, p]) => k !== 'nexbotix' && p.host === d.data.host && p.port === d.data.port);
            if (matching) setPreset(matching[0]);
            else setPreset('custom');
          }
        } else if (mailboxesList.length > 0) {
          setPreset('nexbotix');
        }
      }
    } catch { /* ignore */ }
  };

  const applyPreset = (key: string) => {
    setPreset(key);
    if (key === 'nexbotix') {
      const mb = inhouseMailboxes.find(m => m.email === selectedInhouseMailbox) || inhouseMailboxes[0];
      setForm(f => ({
        ...f,
        host: 'mail.nexbotix.online',
        port: 465,
        useTLS: true,
        username: mb ? mb.email : f.username,
        senderEmail: mb ? mb.email : f.senderEmail,
        senderName: f.senderName || (mb ? mb.username : ''),
      }));
      return;
    }
    const p = PRESETS[key];
    if (p) {
      setForm(f => ({ ...f, host: p.host, port: p.port, useTLS: p.useTLS }));
    }
  };

  const handleConnectInhouse = async (mailboxId: string, email: string) => {
    setConnectingMailboxId(mailboxId);
    setMsg(null);
    try {
      const res = await apiFetch(API_ENDPOINTS.email.mailboxConnectSMTP(mailboxId), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.success) {
        setMsg({
          text: `🎉 Success! ${email} is now connected as your active Nexbotix Sender.`,
          type: 'success',
        });
        await load();
      } else {
        setMsg({ text: data.error || 'Failed to connect in-house mailbox to SMTP.', type: 'error' });
      }
    } catch {
      setMsg({ text: 'Error connecting in-house mailbox to SMTP.', type: 'error' });
    } finally {
      setConnectingMailboxId(null);
    }
  };

  const uploadDeck = async (file: File) => {
    setUploadingDeck(true); setMsg(null);
    try {
      const body = new FormData();
      body.append('deck', file);
      const r = await apiFetch(API_ENDPOINTS.email.uploadDeck, { method: 'POST', body });
      const d = await r.json();
      if (d.success) {
        setForm(f => ({ ...f, deckURL: d.filePath, deckName: d.fileName }));
        setMsg({ text: 'Deck uploaded — remember to click Save Settings to apply it.', type: 'success' });
      } else {
        setMsg({ text: d.error || 'Failed to upload deck', type: 'error' });
      }
    } catch { setMsg({ text: 'Network error uploading deck', type: 'error' }); }
    setUploadingDeck(false);
  };

  const save = async () => {
    let checkForm = { ...form };
    if (preset === 'nexbotix') {
      checkForm.host = checkForm.host || 'mail.nexbotix.online';
      checkForm.port = 465;
      checkForm.useTLS = true;
      if (!checkForm.username) {
        setMsg({ text: 'Mailbox username/email is required', type: 'error' });
        return;
      }
      checkForm.senderEmail = checkForm.username;
    } else if (preset === 'hostinger') {
      checkForm.host = 'hostinger-api';
      checkForm.port = 0;
      checkForm.useTLS = false;
      if (!checkForm.username) {
        setMsg({ text: 'Mailbox Address is required', type: 'error' });
        return;
      }
      checkForm.senderEmail = checkForm.username; // Keep in sync for sending
    } else {
      if (!checkForm.host || !checkForm.username || !checkForm.senderEmail) {
        setMsg({ text: 'Host, username and sender email are required', type: 'error' });
        return;
      }
    }

    setSaving(true); setMsg(null);
    try {
      const r = await apiFetch(API_ENDPOINTS.email.smtp, { method: 'POST', body: JSON.stringify(checkForm) });
      const d = await r.json();
      if (d.success) {
        setSaved(d.data);
        setForm(f => ({ ...f, password: '' })); // stored encrypted server-side; keep the field blank so it isn't re-sent
        setMsg({ text: 'Email settings saved successfully!', type: 'success' });
      }
      else setMsg({ text: d.error || 'Failed to save', type: 'error' });
    } catch { setMsg({ text: 'Network error', type: 'error' }); }
    setSaving(false);
  };

  const test = async () => {
    let checkForm = { ...form };
    if (preset === 'nexbotix') {
      checkForm.host = checkForm.host || 'mail.nexbotix.online';
      checkForm.port = 465;
      checkForm.useTLS = true;
      if (!checkForm.username) {
        setMsg({ text: 'Mailbox email is required to test connection', type: 'error' });
        return;
      }
      checkForm.senderEmail = checkForm.username;
    } else if (preset === 'hostinger') {
      checkForm.host = 'hostinger-api';
      checkForm.port = 0;
      checkForm.useTLS = false;
      if (!checkForm.username) {
        setMsg({ text: 'Mailbox Address is required to test connection', type: 'error' });
        return;
      }
      checkForm.senderEmail = checkForm.username; // Keep in sync
    } else {
      if (!checkForm.host || !checkForm.username) {
        setMsg({ text: 'Host and username/email are required to test connection', type: 'error' });
        return;
      }
    }

    setTesting(true); setMsg(null);
    try {
      const r = await apiFetch(API_ENDPOINTS.email.smtpTest, { 
        method: 'POST', 
        body: JSON.stringify(checkForm)
      });
      const d = await r.json();
      setMsg({
        text: d.success
          ? (preset === 'hostinger'
              ? '✅ Connection successful! Hostinger API is working.'
              : preset === 'nexbotix'
              ? '✅ Connection successful! Nexbotix In-House Email is connected and verified.'
              : '✅ Connection successful! SMTP is working.')
          : d.error,
        type: d.success ? 'success' : 'error'
      });
      if (d.success && saved) setSaved({ ...saved, isVerified: true });
    } catch { setMsg({ text: 'Network error', type: 'error' }); }
    setTesting(false);
  };

  if (!isPaid) return (
    <div className="text-center py-16">
      <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4"><Settings2 size={28} className="text-amber-500" /></div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">Pro Feature</h2>
      <p className="text-gray-500">SMTP configuration is available on paid plans.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">SMTP Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Connect your email account to send campaigns</p>
        </div>
        {saved?.isVerified && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
            <CheckCircle2 size={14} className="text-green-600" />
            <span className="text-xs font-semibold text-green-700">Verified</span>
          </div>
        )}
      </div>

      {/* In-House Business Email 1-Click Banner */}
      {inhouseMailboxes.length > 0 ? (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-purple-50/90 border border-indigo-200 shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Zap size={18} className="text-amber-300 fill-amber-300" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <span>In-House Business Email</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                    {inhouseMailboxes.length} {inhouseMailboxes.length === 1 ? 'Mailbox' : 'Mailboxes'} Ready
                  </span>
                </h3>
                <p className="text-xs text-gray-600 mt-0.5">
                  Send high-deliverability campaigns from your domain with DKIM &amp; SPF security.
                </p>
              </div>
            </div>
            <a
              href="/email/domains"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline self-start sm:self-auto"
            >
              <span>Manage Domains &amp; Inboxes</span>
              <ArrowRight size={13} />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {inhouseMailboxes.map((mb) => {
              const isActive = (saved?.username?.toLowerCase() === mb.email.toLowerCase()) || 
                               (saved?.senderEmail?.toLowerCase() === mb.email.toLowerCase());
              const isConnecting = connectingMailboxId === mb.id;
              return (
                <div
                  key={mb.id}
                  className={`flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-emerald-50/90 border-emerald-300 shadow-sm ring-1 ring-emerald-300/80'
                      : 'bg-white border-gray-200 hover:border-indigo-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <Mail size={14} className={isActive ? 'text-emerald-600' : 'text-indigo-600'} />
                        <span className="text-xs font-bold text-gray-900 truncate" title={mb.email}>
                          {mb.email}
                        </span>
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium">{mb.domain}</span>
                    </div>
                    {isActive && (
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                        <CheckCircle2 size={10} /> Active
                      </span>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-gray-100 flex items-center gap-2">
                    {isActive ? (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-emerald-100/80 text-emerald-800 text-xs font-bold">
                        <CheckCircle2 size={12} className="text-emerald-600" />
                        <span>Connected as Sender</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isConnecting}
                        onClick={() => handleConnectInhouse(mb.id, mb.email)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                      >
                        {isConnecting ? (
                          <>
                            <Loader2 size={12} className="animate-spin text-amber-300" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={12} className="text-amber-300 fill-amber-300" />
                            <span>1-Click Connect</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2.5">
            <Mail size={16} className="text-gray-400 shrink-0" />
            <span>Want to send campaigns from your branded domain (e.g. <code>info@yourdomain.com</code>)?</span>
          </div>
          <a
            href="/email/domains"
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 shrink-0"
          >
            <span>Setup In-House Domain Email</span>
            <ArrowRight size={12} />
          </a>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        {/* Provider Presets */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email Provider</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(PRESETS).map(([k, v]) => (
              <button key={k} onClick={() => applyPreset(k)}
                className={`px-3 py-1.5 text-sm rounded-lg border-2 font-medium transition-colors ${preset === k ? 'border-blue-500 bg-blue-50 text-blue-700 font-semibold' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {v.label}
              </button>
            ))}
          </div>

          {preset === 'nexbotix' && (
            <div className="mt-3 p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <Zap size={14} className="text-amber-300" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-indigo-950">Nexbotix High-Deliverability Custom Domain Mail Server</h4>
                  <p className="text-xs text-indigo-700 mt-0.5">
                    Pre-configured with DKIM cryptographic signing, SPF authorization, and port 465 SSL encryption.
                  </p>
                </div>
              </div>

              {inhouseMailboxes.length > 0 && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-indigo-100">
                  <span className="text-xs font-semibold text-indigo-950 shrink-0">Selected Mailbox:</span>
                  <select
                    value={selectedInhouseMailbox}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedInhouseMailbox(val);
                      const found = inhouseMailboxes.find(m => m.email === val);
                      if (found) {
                        setForm(f => ({
                          ...f,
                          host: 'mail.nexbotix.online',
                          port: 465,
                          useTLS: true,
                          username: found.email,
                          senderEmail: found.email,
                          senderName: f.senderName || found.username,
                        }));
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-indigo-200 rounded-lg text-gray-800 font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {inhouseMailboxes.map(mb => (
                      <option key={mb.id} value={mb.email}>{mb.email} ({mb.domain})</option>
                    ))}
                  </select>

                  {(() => {
                    const found = inhouseMailboxes.find(m => m.email === selectedInhouseMailbox) || inhouseMailboxes[0];
                    const isConnected = (saved?.username?.toLowerCase() === found?.email?.toLowerCase());
                    if (isConnected) {
                      return (
                        <div className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1.5 shrink-0">
                          <CheckCircle2 size={13} className="text-emerald-600" />
                          <span>Active Sender</span>
                        </div>
                      );
                    }
                    return (
                      <button
                        type="button"
                        disabled={connectingMailboxId === found?.id}
                        onClick={() => found && handleConnectInhouse(found.id, found.email)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 shrink-0 transition-all disabled:opacity-50"
                      >
                        {connectingMailboxId === found?.id ? (
                          <>
                            <Loader2 size={12} className="animate-spin text-amber-300" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <Zap size={12} className="text-amber-300 fill-amber-300" />
                            <span>1-Click Connect</span>
                          </>
                        )}
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {preset === 'gmail' && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg animate-in fade-in slide-in-from-top-1 duration-150">
              <HelpCircle size={15} className="text-blue-600 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-800">For Gmail, use your Gmail address as username and create an <strong>App Password</strong> at myaccount.google.com → Security → 2-Step Verification → App Passwords.</p>
            </div>
          )}
          {preset === 'hostinger' && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-indigo-50 border border-indigo-200 rounded-lg animate-in fade-in slide-in-from-top-1 duration-150">
              <HelpCircle size={15} className="text-indigo-600 mt-0.5 shrink-0" />
              <p className="text-xs text-indigo-800">For Hostinger, create an <strong>API token</strong> in the Hostinger Panel under <strong>Emails ➔ API access</strong>. The token must have access to the Mailbox Address configured below.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {preset !== 'hostinger' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">SMTP Host</label>
                <input value={form.host} onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                  placeholder="smtp.gmail.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Port</label>
                <input type="number" value={form.port} onChange={e => setForm(f => ({ ...f, port: +e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {preset === 'hostinger' ? 'Mailbox Address (Username)' : preset === 'nexbotix' ? 'In-House Mailbox Email' : 'Username / Email'}
            </label>
            <input value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoComplete="off" name="botx_smtp_username"
              placeholder={preset === 'hostinger' ? 'you@yourdomain.com' : 'you@gmail.com'} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              {preset === 'hostinger' ? 'Hostinger API Token' : 'Password / App Password'}
            </label>
            <div className="relative">
              <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                autoComplete="new-password" name="botx_smtp_secret"
                placeholder={saved ? 'Saved — leave blank to keep current' : preset === 'hostinger' ? 'Enter API token' : 'Enter password'}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
              <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {preset === 'nexbotix' && (
              <p className="flex items-center gap-1 mt-1 text-[11px] text-indigo-600">
                <CheckCircle2 size={11} className="text-indigo-600 shrink-0" />
                Password is automatically managed from your Nexbotix custom mailbox.
              </p>
            )}
            {saved && preset !== 'nexbotix' && (
              <p className="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
                <KeyRound size={11} className="text-green-500 shrink-0" />
                A {preset === 'hostinger' ? 'token' : 'password'} is already saved (encrypted). Only fill this to replace it.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Sender Name</label>
            <input value={form.senderName} onChange={e => setForm(f => ({ ...f, senderName: e.target.value }))}
              placeholder="My Business" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
          </div>
          {preset !== 'hostinger' && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sender Email (From)</label>
              <input value={form.senderEmail} onChange={e => setForm(f => ({ ...f, senderEmail: e.target.value }))}
                placeholder="noreply@mybusiness.com" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
            </div>
          )}
        </div>

        {preset !== 'hostinger' && (
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setForm(f => ({ ...f, useTLS: !f.useTLS }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.useTLS ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.useTLS ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-700">Use TLS (port 465) — leave off for STARTTLS (port 587)</span>
          </label>
        )}

        <div className="border-t border-gray-100 pt-5 space-y-4">
          <h3 className="text-sm font-bold text-gray-900">Signature &amp; Company Deck</h3>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-600">Email Signature</label>
              <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
                <button type="button" onClick={() => setSigView('code')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${sigView === 'code' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Code2 size={12} />Code
                </button>
                <button type="button" onClick={() => setSigView('preview')}
                  className={`flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors ${sigView === 'preview' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                  <Eye size={12} />Preview
                </button>
              </div>
            </div>
            {sigView === 'code' ? (
              <textarea value={form.signature} onChange={e => setForm(f => ({ ...f, signature: e.target.value }))}
                placeholder={'Best regards,\nJane Doe\nSales, My Business'} rows={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y" />
            ) : form.signature.trim() ? (
              <iframe
                title="Signature Preview"
                srcDoc={`<base target="_blank"><div style="font-family:Arial,sans-serif;font-size:14px;color:#333;">${form.signature}</div>`}
                sandbox="allow-popups allow-popups-to-escape-sandbox"
                className="w-full h-48 border border-gray-300 rounded-lg bg-white"
              />
            ) : (
              <div className="w-full h-48 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-xs text-gray-400">
                Nothing to preview — add your signature in the Code tab
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Company Deck / Brochure</label>
            {form.deckName ? (
              <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <FileText size={15} className="text-gray-400 shrink-0" />
                <span className="flex-1 truncate text-gray-700">{form.deckName}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, deckURL: '', deckName: '' }))}
                  className="text-gray-400 hover:text-red-500 shrink-0">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 cursor-pointer hover:border-gray-400 hover:text-gray-600 transition-colors">
                {uploadingDeck ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                {uploadingDeck ? 'Uploading…' : 'Upload PDF / DOC / PPT'}
                <input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" className="hidden" disabled={uploadingDeck}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadDeck(f); e.target.value = ''; }} />
              </label>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setForm(f => ({ ...f, autoAttachSignature: !f.autoAttachSignature }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.autoAttachSignature ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.autoAttachSignature ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-700">Auto-attach signature to every email</span>
          </label>

          <label className={`flex items-center gap-3 select-none ${form.deckName ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
            <div onClick={() => form.deckName && setForm(f => ({ ...f, autoAttachDeck: !f.autoAttachDeck }))}
              className={`relative w-10 h-5 rounded-full transition-colors ${form.autoAttachDeck ? 'bg-blue-600' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.autoAttachDeck ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-700">Auto-attach company deck to every email{!form.deckName && ' (upload a deck first)'}</span>
          </label>
        </div>

        {msg && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {msg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            {msg.text}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <button onClick={test} disabled={testing}
            className="flex items-center gap-2 px-5 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-lg text-sm font-semibold transition-colors">
            {testing ? <Loader2 size={15} className="animate-spin" /> : saved?.isVerified ? <Wifi size={15} className="text-green-600" /> : <WifiOff size={15} />}
            {testing ? 'Testing…' : 'Test Connection'}
          </button>
        </div>
      </div>

      <EmailAPIPlayground />
    </div>
  );
}
