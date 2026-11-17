import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Search, RefreshCw, ChevronLeft, ChevronRight, Inbox, Calendar, User, ArrowLeft, Loader2, Info, Bell, Plus, Trash2, X, AlertCircle } from 'lucide-react';
import { apiFetch, API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/Toast';

interface EmailMessage {
  uid: string | number;
  subject: string;
  from: string;
  date: string;
  size: number;
  seen: boolean;
}

interface MessageText {
  plain: string;
  html: string;
}

interface EmailReminder {
  id: string;
  sendTo: string;
  time: string;
  sent: boolean;
  loopCount: number;
  interval: number;
}

interface EmailMetadata {
  id: string;
  userId: string;
  messageUid: string | number;
  priority: string;
  reminders: EmailReminder[];
  messageSubject: string;
  messageSender: string;
}

interface InboxAccount {
  id: string;
  email: string;
  domain: string;
  isSendOnly: boolean;
  isDefault: boolean;
  provider: string;
}

export function EmailInboxPage({ isPaid }: { isPaid: boolean }) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlMailbox = searchParams.get('mailbox') || '';

  const { user } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUid, setSelectedUid] = useState<string | number | null>(null);
  const [messageText, setMessageText] = useState<MessageText | null>(null);
  const [loadingText, setLoadingText] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const perPage = 15;

  const [inboxAccounts, setInboxAccounts] = useState<InboxAccount[]>([]);
  const [selectedMailbox, setSelectedMailbox] = useState<string>(urlMailbox);

  const [metadataList, setMetadataList] = useState<EmailMetadata[]>([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [remTargetEmail, setRemTargetEmail] = useState('');
  const [remTime, setRemTime] = useState('');
  const [remLoop, setRemLoop] = useState(false);
  const [remLoopCount, setRemLoopCount] = useState(1);
  const [remInterval, setRemInterval] = useState(15);

  useEffect(() => {
    if (isPaid) {
      fetchInboxAccounts();
    }
  }, [isPaid]);

  useEffect(() => {
    if (isPaid) {
      fetchMessages(selectedMailbox, page);
      fetchMetadata();
    }
  }, [isPaid, page, selectedMailbox]);

  const fetchInboxAccounts = async () => {
    try {
      const r = await apiFetch(API_ENDPOINTS.email.inboxMailboxes);
      const d = await r.json();
      if (d.success && Array.isArray(d.data)) {
        setInboxAccounts(d.data);
        if (!urlMailbox && d.data.length > 0) {
          const defaultAcc = d.data.find((a: InboxAccount) => a.isDefault && !a.isSendOnly)
            || d.data.find((a: InboxAccount) => !a.isSendOnly)
            || d.data[0];
          if (defaultAcc) {
            setSelectedMailbox(defaultAcc.email || defaultAcc.id);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch inbox accounts', e);
    }
  };

  const fetchMessages = async (mb = selectedMailbox, pageNum = page) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_ENDPOINTS.email.inbox}?page=${pageNum}&perPage=${perPage}`;
      if (mb) {
        url += `&mailbox=${encodeURIComponent(mb)}`;
      }
      const r = await apiFetch(url);
      const d = await r.json();
      if (d.success) {
        setMessages(d.data || []);
        setTotal(d.total || 0);
      } else {
        setError(d.error || 'Failed to fetch messages');
      }
    } catch {
      setError('Network error: Failed to connect to server');
    }
    setLoading(false);
  };

  const fetchMessageBody = async (uid: string | number) => {
    setSelectedUid(uid);
    setLoadingText(true);
    setMessageText(null);
    try {
      let url = `${API_ENDPOINTS.email.inbox}/message/${uid}`;
      if (selectedMailbox) {
        url += `?mailbox=${encodeURIComponent(selectedMailbox)}`;
      }
      const r = await apiFetch(url);
      const d = await r.json();
      if (d.success && d.data) {
        setMessageText(d.data);
        // Mark as seen locally
        setMessages(msgs => msgs.map(m => m.uid === uid ? { ...m, seen: true } : m));
      } else {
        setError(d.error || 'Failed to load email content');
      }
    } catch {
      setError('Network error loading email content');
    }
    setLoadingText(false);
  };
  const fetchMetadata = async () => {
    try {
      const r = await apiFetch(API_ENDPOINTS.email.inboxMetadata);
      const d = await r.json();
      if (d.success) {
        setMetadataList(d.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch metadata", e);
    }
  };

  const handleUpdateMetadata = async (uid: string | number, priority: string, reminders: EmailReminder[]) => {
    try {
      const msg = messages.find(m => m.uid === uid);
      const payload = {
        priority,
        reminders,
        messageSubject: msg?.subject || '',
        messageSender: msg?.from || '',
      };
      const r = await apiFetch(API_ENDPOINTS.email.updateInboxMetadata(uid.toString()), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      if (d.success) {
        setMetadataList(prev => {
          const exists = prev.some(m => m.messageUid === uid);
          if (exists) {
            return prev.map(m => m.messageUid === uid ? d.data : m);
          }
          return [...prev, d.data];
        });
        showToast('Priority and reminders updated successfully.', 'success');
      } else {
        showToast(d.error || 'Failed to update priority/reminders', 'error');
      }
    } catch {
      showToast('Network error updating email metadata', 'error');
    }
  };
  // Filter messages based on search query
  const filteredMessages = messages.filter(m => 
    m.subject.toLowerCase().includes(search.toLowerCase()) ||
    m.from.toLowerCase().includes(search.toLowerCase())
  );

  const selectedMsg = messages.find(m => m.uid === selectedUid);
  const msgMeta = metadataList.find(m => m.messageUid === selectedUid);

  if (!isPaid) {
    return (
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Inbox size={28} className="text-amber-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Pro Feature</h2>
        <p className="text-gray-500">Inbox polling is available on paid plans.</p>
      </div>
    );
  }

  // Render warning if not configured
  if (error && error.includes('Hostinger API')) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-xl mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail size={28} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Hostinger Mailbox</h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          The Inbox feature uses Hostinger's HTTP Mail API to fetch and render incoming messages. To view your emails here, please connect your Hostinger account first.
        </p>
        <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 mb-6 flex gap-3 text-left">
          <Info size={18} className="text-indigo-500 shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600">
            Go to the <strong>SMTP Setup</strong> tab, select <strong>Hostinger API</strong> as the provider, and enter your API Access Token.
          </p>
        </div>
      </div>
    );
  }

  const currentAccount = inboxAccounts.find(a => (a.email.toLowerCase() === selectedMailbox.toLowerCase() || a.id === selectedMailbox));

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between border-b border-gray-150 p-4 gap-3 bg-slate-50/50">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
            <Inbox size={16} className="text-blue-500" />
            Inbox ({total})
          </h3>
          <button 
            onClick={() => { fetchMessages(); fetchMetadata(); }} 
            disabled={loading}
            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-white border border-transparent hover:border-gray-200 rounded-lg transition-all"
            title="Refresh Inbox"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* Mailbox Selector */}
          {inboxAccounts.length > 0 && (
            <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-gray-200">
              <span className="text-[11px] font-semibold text-gray-500 hidden md:inline">Account:</span>
              <select
                value={selectedMailbox}
                onChange={e => {
                  const val = e.target.value;
                  setSelectedMailbox(val);
                  setPage(1);
                  setSelectedUid(null);
                  setSearchParams(prev => {
                    const p = new URLSearchParams(prev);
                    if (val) p.set('mailbox', val); else p.delete('mailbox');
                    return p;
                  }, { replace: true });
                }}
                className="text-xs font-semibold py-1 px-2.5 rounded-lg border border-gray-200 bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500 shadow-xs"
              >
                {inboxAccounts.map(acc => (
                  <option key={acc.id} value={acc.email || acc.id}>
                    {acc.email} {acc.isSendOnly ? '(Send Only)' : ''} {acc.isDefault ? '★' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Search bar */}
          <div className="relative w-full sm:w-60">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search sender, subject..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            />
          </div>

          {/* Pagination */}
          <div className="flex items-center gap-1 shrink-0">
            <button 
              disabled={page === 1 || loading}
              onClick={() => setPage(p => p - 1)}
              className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-gray-500 px-2 font-medium">
              {Math.min(total, (page - 1) * perPage + 1)}-{Math.min(total, page * perPage)} of {total}
            </span>
            <button 
              disabled={page * perPage >= total || loading}
              onClick={() => setPage(p => p + 1)}
              className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Warning if current account is send-only */}
      {currentAccount?.isSendOnly && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-amber-600 shrink-0" />
            <span>
              <strong>{currentAccount.email}</strong> is configured as <strong>Send Only</strong>. Incoming emails sent to this address will not be received.
            </span>
          </div>
          <button
            onClick={() => navigate('/email?tab=domains')}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 underline shrink-0 ml-3"
          >
            Manage in Custom Domain Email
          </button>
        </div>
      )}

      {/* Main split-pane content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        
        {/* Left Side: Message List */}
        <div className={`w-full ${selectedUid ? 'hidden md:block md:w-[350px] lg:w-[400px]' : ''} border-r border-gray-150 overflow-y-auto divide-y divide-gray-100 flex-shrink-0`}>
          {loading && messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Loader2 size={24} className="animate-spin text-blue-500" />
              <span className="text-xs">Fetching messages...</span>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2 text-center px-4">
              <Inbox size={32} className="text-gray-300" />
              <span className="text-xs font-semibold text-gray-600">No emails found</span>
              <span className="text-[11px] text-gray-400">Emails will appear here once received.</span>
            </div>
          ) : (
            filteredMessages.map(msg => {
              const msgMeta = metadataList.find(m => m.messageUid === msg.uid);
              return (
                <div 
                  key={msg.uid}
                  onClick={() => fetchMessageBody(msg.uid)}
                  className={`p-4 cursor-pointer transition-colors relative text-left ${
                    selectedUid === msg.uid 
                      ? 'bg-blue-50/70 border-l-4 border-blue-500' 
                      : 'hover:bg-slate-50 border-l-4 border-transparent'
                  } ${!msg.seen ? 'bg-slate-50/30' : ''}`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1.5">
                    <span className={`text-xs truncate ${!msg.seen ? 'font-bold text-gray-900' : 'text-gray-600 font-medium'}`}>
                      {msg.from}
                    </span>
                    <span className="text-[10px] text-gray-400 shrink-0">
                      {new Date(msg.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <h4 className={`text-xs truncate mb-1.5 ${!msg.seen ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                    {msg.subject || '(No Subject)'}
                  </h4>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <span>{(msg.size / 1024).toFixed(1)} KB</span>
                      {msgMeta?.priority === 'high' && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-100 font-semibold text-[9px] uppercase tracking-wider shrink-0">
                          High
                        </span>
                      )}
                      {msgMeta?.priority === 'medium' && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100 font-semibold text-[9px] uppercase tracking-wider shrink-0">
                          Medium
                        </span>
                      )}
                      {msgMeta?.priority === 'low' && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100 font-semibold text-[9px] uppercase tracking-wider shrink-0">
                          Low
                        </span>
                      )}
                      {msgMeta?.reminders && msgMeta.reminders.some(r => !r.sent) && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 border border-indigo-100 font-semibold text-[9px] shrink-0">
                          <Bell size={8} />
                          Reminder
                        </span>
                      )}
                    </div>
                    {!msg.seen && (
                      <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Side: Message Preview Pane */}
        <div className={`flex-1 flex flex-col overflow-hidden min-w-0 bg-slate-50/30 ${!selectedUid ? 'hidden md:flex' : ''}`}>
          {selectedUid ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Back button for mobile */}
              <div className="md:hidden border-b border-gray-150 p-3 bg-white flex items-center">
                <button 
                  onClick={() => setSelectedUid(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft size={14} />
                  <span>Back to List</span>
                </button>
              </div>

              {/* Email details header */}
              <div className="bg-white border-b border-gray-150 p-5 shrink-0 text-left">
                <h2 className="text-sm font-bold text-gray-900 mb-3">{selectedMsg?.subject || '(No Subject)'}</h2>
                <div className="flex flex-col gap-1.5 text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <User size={13} className="text-gray-400" />
                    <span className="font-semibold text-gray-700">From:</span>
                    <span>{selectedMsg?.from}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar size={13} className="text-gray-400" />
                    <span className="font-semibold text-gray-700">Date:</span>
                    <span>{selectedMsg ? new Date(selectedMsg.date).toLocaleString() : ''}</span>
                  </div>
                </div>
              </div>

              {/* Actions & Reminders Panel */}
              <div className="bg-slate-50/50 border-b border-gray-150 p-4 shrink-0 text-left flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                {/* Priority Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">Priority:</span>
                  <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
                    {(['none', 'low', 'medium', 'high'] as const).map(p => {
                      const isActive = (msgMeta?.priority || 'none') === (p === 'none' ? '' : p);
                      const label = p.charAt(0).toUpperCase() + p.slice(1);
                      let btnClass = "px-2.5 py-1 text-[11px] rounded-md font-medium transition-all ";
                      if (isActive) {
                        if (p === 'high') btnClass += "bg-rose-500 text-white shadow-sm";
                        else if (p === 'medium') btnClass += "bg-amber-500 text-white shadow-sm";
                        else if (p === 'low') btnClass += "bg-emerald-500 text-white shadow-sm";
                        else btnClass += "bg-gray-700 text-white shadow-sm";
                      } else {
                        btnClass += "text-gray-600 hover:bg-gray-50";
                      }
                      return (
                        <button
                          key={p}
                          onClick={() => handleUpdateMetadata(selectedUid!, p === 'none' ? '' : p, msgMeta?.reminders || [])}
                          className={btnClass}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Reminder Settings Trigger Button */}
                <button
                  onClick={() => {
                    setRemTargetEmail(user?.email || '');
                    const defaultTime = new Date(Date.now() + 15 * 60 * 1000);
                    const tzoffset = defaultTime.getTimezoneOffset() * 60000;
                    const localISOTime = (new Date(defaultTime.getTime() - tzoffset)).toISOString().slice(0, 16);
                    setRemTime(localISOTime);
                    setRemLoop(false);
                    setRemLoopCount(1);
                    setRemInterval(15);
                    setShowReminderModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-sm transition-colors shrink-0"
                >
                  <Bell size={12} />
                  <span>Configure Reminders ({msgMeta?.reminders?.filter((r: EmailReminder) => !r.sent).length || 0})</span>
                </button>
              </div>

              {/* Email body renderer */}
              <div className="flex-1 overflow-y-auto p-6 flex flex-col">
                {loadingText ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
                    <Loader2 size={24} className="animate-spin text-blue-500" />
                    <span className="text-xs">Loading email content...</span>
                  </div>
                ) : messageText ? (
                  messageText.html ? (
                    <iframe 
                      title="Email Body"
                      srcDoc={messageText.html}
                      className="w-full flex-1 border border-gray-200 rounded-lg bg-white shadow-inner animate-in fade-in zoom-in-95 duration-200"
                      sandbox="allow-popups allow-popups-to-escape-sandbox"
                    />
                  ) : (
                    <div className="w-full flex-1 border border-gray-200 rounded-lg bg-white p-5 text-sm text-gray-700 whitespace-pre-wrap font-mono shadow-inner overflow-y-auto text-left animate-in fade-in zoom-in-95 duration-200">
                      {messageText.plain || '(Empty Message)'}
                    </div>
                  )
                ) : (
                  <div className="text-xs text-red-500 text-center py-10">
                    Failed to render email body.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
              <Mail size={40} className="text-gray-300 animate-pulse" />
              <span className="text-xs font-medium">Select an email to read its content</span>
            </div>
          )}
        </div>
        
      </div>

      {/* Reminder Configuration Modal */}
      {showReminderModal && selectedMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-md p-6 relative animate-in zoom-in-95 duration-200 flex flex-col text-left">
            <button 
              onClick={() => setShowReminderModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>

            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-2">
              <Bell size={16} className="text-indigo-500" />
              Configure Reminders
            </h3>
            <p className="text-xs text-gray-500 mb-4 truncate">
              For: {selectedMsg.subject || '(No Subject)'}
            </p>

            {/* List of existing reminders */}
            <div className="mb-5">
              <h4 className="text-xs font-semibold text-gray-700 mb-2">Active Reminders</h4>
              {(msgMeta?.reminders || []).length === 0 ? (
                <div className="text-[11px] text-gray-400 bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                  No reminders configured for this email.
                </div>
              ) : (
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {(msgMeta?.reminders || []).map((rem: EmailReminder) => (
                    <div 
                      key={rem.id}
                      className="flex items-center justify-between p-2 bg-slate-50 border border-slate-150 rounded-lg text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-gray-800 truncate">{rem.sendTo}</div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(rem.time).toLocaleString()}
                          {rem.loopCount > 0 && ` (repeats ${rem.loopCount}x every ${rem.interval}m)`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${
                          rem.sent ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                        }`}>
                          {rem.sent ? 'Sent' : 'Scheduled'}
                        </span>
                        <button
                          onClick={() => {
                            const updated = (msgMeta?.reminders || []).filter((r: EmailReminder) => r.id !== rem.id);
                            handleUpdateMetadata(selectedUid!, msgMeta?.priority || '', updated);
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                          title="Delete Reminder"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to add a new reminder */}
            <div className="border-t border-gray-150 pt-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3">Add New Reminder</h4>
              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Send Reminder To</label>
                  <input 
                    type="email" 
                    placeholder="email@example.com"
                    value={remTargetEmail}
                    onChange={e => setRemTargetEmail(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">Schedule Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={remTime}
                    onChange={e => setRemTime(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                {/* Loop trigger configuration */}
                <div className="bg-slate-50 border border-slate-150 rounded-lg p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={remLoop}
                      onChange={e => setRemLoop(e.target.checked)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs font-semibold text-gray-700 select-none">Repeat/Loop reminder</span>
                  </label>
                  
                  {remLoop && (
                    <div className="grid grid-cols-2 gap-3 mt-3 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Repeat Count</label>
                        <input 
                          type="number" 
                          min="1"
                          max="20"
                          value={remLoopCount}
                          onChange={e => setRemLoopCount(parseInt(e.target.value) || 1)}
                          className="w-full px-2.5 py-1 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-gray-500 mb-1">Interval (minutes)</label>
                        <input 
                          type="number" 
                          min="1"
                          max="1440"
                          value={remInterval}
                          onChange={e => setRemInterval(parseInt(e.target.value) || 15)}
                          className="w-full px-2.5 py-1 border border-gray-200 rounded-md text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                 <button
                  onClick={() => {
                    if (!remTargetEmail.trim() || !remTime) {
                      showToast('Please specify recipient email and scheduled time.', 'warning');
                      return;
                    }
                    const newReminder: EmailReminder = {
                      id: Math.random().toString(36).substring(2, 9),
                      sendTo: remTargetEmail.trim(),
                      time: new Date(remTime).toISOString(),
                      sent: false,
                      loopCount: remLoop ? remLoopCount : 0,
                      interval: remLoop ? remInterval : 0
                    };
                    const updated = [...(msgMeta?.reminders || []), newReminder];
                    handleUpdateMetadata(selectedUid!, msgMeta?.priority || '', updated);
                    // Reset inputs
                    setRemLoop(false);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow transition-colors"
                >
                  <Plus size={14} />
                  <span>Schedule Reminder</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {ToastComponent}
    </div>
  );
}
