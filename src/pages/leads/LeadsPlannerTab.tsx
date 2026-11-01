import { useState, useEffect, useCallback, useRef } from 'react';
import {
	Sparkles, Loader2, Play, Pause, Trash2, Save, Wand2, Mail, ChevronDown, ChevronUp,
	CalendarDays, Plus, RefreshCw, Check, Rocket
} from 'lucide-react';
import { apiFetch, API_BASE_URL, API_ENDPOINTS } from '@/config/api';

interface PlanDay {
	index: number;
	date: string;
	niche: string;
	location: string;
	targetEmails: number;
	providers: string[];
	subject: string;
	bodyHtml: string;
	autoSend: boolean;
	status: string;
	found: number;
	sent: number;
	failed: number;
	providerStats?: Record<string, number>;
	campaignId?: string;
	lastError?: string;
}

interface Plan {
	id: string;
	name: string;
	prompt: string;
	startDate: string;
	timezone: string;
	runTime: string;
	status: string;
	notifyEmail: boolean;
	days: PlanDay[];
}

interface SavedTemplate {
	id: string;
	name: string;
	category?: string;
	subject: string;
	bodyHtml: string;
}

interface PlanRun {
	id: string;
	dayIndex: number;
	niche: string;
	location: string;
	target: number;
	found: number;
	reused: number;
	sent: number;
	failed: number;
	status: string;
	message?: string;
	startedAt: string;
	providerStats?: Record<string, number>;
}

const API = `${API_BASE_URL}/api/lead-plans`;
const PROVIDERS = [
	{ id: 'trustpilot', label: 'Trustpilot' },
	{ id: 'gmap', label: 'Google Maps' },
	{ id: 'bing', label: 'Bing Maps' },
];
const EXAMPLE =
	'Day 1: 300 hotels in Alabama from Trustpilot\nDay 2: 500 restaurants in Alabama\nDay 3: 500 private schools in Alabama\nDay 4: 500 real estate agents in Alabama\nDay 5: 500 salons in Alabama';

const STATUS_STYLE: Record<string, string> = {
	pending: 'bg-slate-700 text-slate-300',
	running: 'bg-blue-600/30 text-blue-300 animate-pulse',
	done: 'bg-emerald-600/30 text-emerald-300',
	partial: 'bg-amber-600/30 text-amber-300',
	failed: 'bg-rose-600/30 text-rose-300',
	missed: 'bg-slate-700 text-slate-400',
	draft: 'bg-slate-700 text-slate-300',
	active: 'bg-emerald-600/30 text-emerald-300',
	paused: 'bg-amber-600/30 text-amber-300',
	completed: 'bg-blue-600/30 text-blue-300',
};

// Variables filled per lead at send time. `fallback` is used when that lead has no value.
const TEMPLATE_VARS: { key: string; desc: string; fallback: string; sample: string }[] = [
	{ key: 'name',     desc: 'Business name',      fallback: 'there',              sample: 'Sea Breeze Hotel' },
	{ key: 'company',  desc: 'Business name',      fallback: 'your business',      sample: 'Sea Breeze Hotel' },
	{ key: 'city',     desc: 'City (or plan location)', fallback: 'your area',     sample: 'Mobile' },
	{ key: 'state',    desc: 'State',              fallback: 'your state',         sample: 'AL' },
	{ key: 'address',  desc: 'Street address',     fallback: 'your location',      sample: '123 Main St' },
	{ key: 'phone',    desc: 'Phone number',       fallback: 'your phone number',  sample: '(251) 555-0100' },
	{ key: 'website',  desc: 'Website',            fallback: 'your website',       sample: 'www.seabreeze.com' },
	{ key: 'niche',    desc: 'Business category',  fallback: 'your industry',      sample: 'hotel' },
	{ key: 'location', desc: 'Plan location',      fallback: 'your area',          sample: 'Alabama' },
	{ key: 'rating',   desc: 'Star rating',        fallback: '',                   sample: '4.5' },
	{ key: 'reviews',  desc: 'Review count',       fallback: '',                   sample: '120' },
];

// Mirrors the server: lead value, else inline default {{city|your area}}, else the variable's fallback.
// `missing` simulates a lead with no data so you can see the fallbacks.
const fillSample = (text: string, d: PlanDay, missing: boolean) =>
	text.replace(/\{\{\s*(\w+)\s*(?:\|\s*([^}]*?)\s*)?\}\}/g, (_m, k: string, inline?: string) => {
		const v = TEMPLATE_VARS.find(x => x.key === k.toLowerCase());
		const real = missing ? '' : (k.toLowerCase() === 'location' ? d.location : v?.sample) || '';
		return real || (inline || '').trim() || v?.fallback || '';
	});

const tomorrow = () => {
	const d = new Date();
	d.setDate(d.getDate() + 1);
	return d.toISOString().slice(0, 10);
};

export function LeadsPlannerTab() {
	const [plans, setPlans] = useState<Plan[]>([]);
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [plan, setPlan] = useState<Plan | null>(null);
	const [runs, setRuns] = useState<PlanRun[]>([]);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState('');
	const [dirty, setDirty] = useState(false);
	const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
	const [expanded, setExpanded] = useState<number | null>(null);
	const [templates, setTemplates] = useState<SavedTemplate[]>([]);
	const [preview, setPreview] = useState<Record<number, boolean>>({});
	const [simMissing, setSimMissing] = useState<Record<number, boolean>>({});

	const [prompt, setPrompt] = useState('');
	const [startDate, setStartDate] = useState(tomorrow());
	const [runTime, setRunTime] = useState('09:00');
	const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
	const [instruction, setInstruction] = useState('');
	const dirtyRef = useRef(false);
	dirtyRef.current = dirty;

	const showToast = (msg: string, ok = true) => {
		setToast({ msg, ok });
		setTimeout(() => setToast(null), 5000);
	};

	// All endpoints reply {success, data} or {success:false, error}.
	const call = useCallback(async (path: string, init?: RequestInit) => {
		const res = await apiFetch(`${API}${path}`, init);
		const json = await res.json().catch(() => ({}));
		if (!res.ok || json.success === false) throw new Error(json.error || `Request failed (${res.status})`);
		return json.data;
	}, []);

	const loadList = useCallback(async () => {
		try {
			const data: Plan[] = await call('');
			setPlans(data || []);
		} catch (e: any) {
			showToast(e.message, false);
		} finally {
			setLoading(false);
		}
	}, [call]);

	const loadPlan = useCallback(async (id: string, keepEdits = false) => {
		try {
			const [p, r] = await Promise.all([call(`/${id}`), call(`/${id}/runs?limit=30`)]);
			if (!(keepEdits && dirtyRef.current)) {
				setPlan(p);
				setDirty(false);
			} else {
				// keep the user's unsaved edits but refresh run state
				setPlan(prev => prev && ({
					...prev,
					status: p.status,
					days: prev.days.map(d => {
						const s = p.days.find((x: PlanDay) => x.index === d.index);
						return s ? { ...d, status: s.status, found: s.found, sent: s.sent, failed: s.failed, providerStats: s.providerStats, lastError: s.lastError, campaignId: s.campaignId } : d;
					}),
				}));
			}
			setRuns(r || []);
		} catch (e: any) {
			showToast(e.message, false);
		}
	}, [call]);

	useEffect(() => { loadList(); }, [loadList]);
	useEffect(() => {
		(async () => {
			try {
				const res = await apiFetch(API_ENDPOINTS.email.templates);
				const json = await res.json();
				if (json.success) setTemplates(json.data || []);
			} catch { /* templates are optional */ }
		})();
	}, []);
	useEffect(() => { if (selectedId) loadPlan(selectedId); }, [selectedId, loadPlan]);

	// Poll while a day is running.
	const hasRunning = plan?.days.some(d => d.status === 'running');
	useEffect(() => {
		if (!selectedId || !hasRunning) return;
		const t = setInterval(() => loadPlan(selectedId, true), 6000);
		return () => clearInterval(t);
	}, [selectedId, hasRunning, loadPlan]);

	const act = async (key: string, fn: () => Promise<void>) => {
		setBusy(key);
		try { await fn(); } catch (e: any) { showToast(e.message, false); } finally { setBusy(''); }
	};

	const createPlan = () => act('create', async () => {
		if (!prompt.trim()) throw new Error('Describe what you want first');
		const p: Plan = await call('', { method: 'POST', body: JSON.stringify({ prompt, startDate, runTime, timezone }) });
		setPrompt('');
		await loadList();
		setPlan(p); setSelectedId(p.id); setDirty(false);
		showToast(`Draft plan created with ${p.days.length} day(s). Review it, add templates, then activate.`);
	});

	const savePlan = () => act('save', async () => {
		if (!plan) return;
		const p: Plan = await call(`/${plan.id}`, {
			method: 'PUT',
			body: JSON.stringify({ name: plan.name, startDate: plan.startDate, timezone: plan.timezone, runTime: plan.runTime, notifyEmail: plan.notifyEmail, days: plan.days }),
		});
		setPlan(p); setDirty(false); loadList();
		showToast('Plan saved');
	});

	const setStatus = (s: 'activate' | 'pause') => act(s, async () => {
		if (!plan) return;
		if (dirty) await savePlanSilently();
		const p: Plan = await call(`/${plan.id}/${s}`, { method: 'POST' });
		setPlan(p); loadList();
		showToast(s === 'activate' ? 'Plan activated. Each day runs automatically at its time.' : 'Plan paused');
	});

	const savePlanSilently = async () => {
		if (!plan) return;
		const p: Plan = await call(`/${plan.id}`, {
			method: 'PUT',
			body: JSON.stringify({ name: plan.name, startDate: plan.startDate, timezone: plan.timezone, runTime: plan.runTime, notifyEmail: plan.notifyEmail, days: plan.days }),
		});
		setPlan(p); setDirty(false);
	};

	const refine = () => act('refine', async () => {
		if (!plan || !instruction.trim()) return;
		if (dirty) await savePlanSilently();
		const p: Plan = await call(`/${plan.id}/refine`, { method: 'POST', body: JSON.stringify({ instruction }) });
		setPlan(p); setInstruction(''); setDirty(false);
		showToast('Plan updated by AI');
	});

	const genTemplates = (overwrite: boolean) => act('tpl', async () => {
		if (!plan) return;
		if (dirty) await savePlanSilently();
		try {
			const p: Plan = await call(`/${plan.id}/generate-templates`, { method: 'POST', body: JSON.stringify({ overwrite }) });
			setPlan(p); setDirty(false);
			showToast('Email templates generated');
		} catch (e: any) {
			await loadPlan(plan.id);
			throw e;
		}
	});

	const runDay = (idx: number) => act(`run${idx}`, async () => {
		if (!plan) return;
		if (dirty) await savePlanSilently();
		await call(`/${plan.id}/days/${idx}/run`, { method: 'POST' });
		showToast(`Day ${idx + 1} started`);
		await loadPlan(plan.id);
	});

	const deletePlan = () => act('del', async () => {
		if (!plan || !window.confirm(`Delete plan "${plan.name}"? Leads already collected are kept.`)) return;
		await call(`/${plan.id}`, { method: 'DELETE' });
		setPlan(null); setSelectedId(null); loadList();
	});

	const editDay = (idx: number, patch: Partial<PlanDay>) => {
		setPlan(p => p && ({ ...p, days: p.days.map(d => (d.index === idx ? { ...d, ...patch } : d)) }));
		setDirty(true);
	};
	const editPlan = (patch: Partial<Plan>) => { setPlan(p => p && ({ ...p, ...patch })); setDirty(true); };

	// Copies a saved template into a day (or every editable day when applyAll).
	const applyTemplate = (idx: number, templateId: string, applyAll = false) => {
		const t = templates.find(x => x.id === templateId);
		if (!t || !plan) return;
		setPlan(p => p && ({
			...p,
			days: p.days.map(d => (d.index === idx || (applyAll && !locked(d))
				? { ...d, subject: t.subject, bodyHtml: t.bodyHtml, autoSend: true }
				: d)),
		}));
		setDirty(true);
		showToast(applyAll ? `"${t.name}" applied to all upcoming days` : `Day ${idx + 1} now uses "${t.name}"`);
	};

	// Inserts {{key}} at the cursor of this day's body editor (or appends when it is not focused).
	const insertVar = (idx: number, key: string) => {
		const el = document.getElementById(`body-${idx}`) as HTMLTextAreaElement | null;
		const d = plan?.days.find(x => x.index === idx);
		if (!d) return;
		const tag = `{{${key}}}`;
		const pos = el ? el.selectionStart : d.bodyHtml.length;
		const end = el ? el.selectionEnd : pos;
		editDay(idx, { bodyHtml: d.bodyHtml.slice(0, pos) + tag + d.bodyHtml.slice(end) });
		setPreview(p => ({ ...p, [idx]: false }));
		setTimeout(() => { el?.focus(); el?.setSelectionRange(pos + tag.length, pos + tag.length); }, 0);
	};

	const locked = (d: PlanDay) => ['running', 'done', 'partial', 'failed'].includes(d.status);
	const input = 'bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500 disabled:opacity-50';
	const btn = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50';

	if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-500" /></div>;

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><Rocket size={22} className="text-amber-500" /> Campaign Planner</h1>
				<p className="text-sm text-slate-400 mt-1">Describe your whole campaign in plain words. Scrappy builds a day-by-day plan, finds leads with emails, and sends tracked emails automatically.</p>
			</div>

			{/* New plan */}
			<div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-3">
				<p className="text-sm font-semibold text-white flex items-center gap-2"><Sparkles size={15} className="text-amber-500" /> New plan from a prompt</p>
				<textarea
					value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
					placeholder={EXAMPLE} className={`${input} w-full resize-y`}
				/>
				<div className="flex flex-wrap items-end gap-3">
					<label className="text-xs text-slate-400">Start date<input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={`${input} block mt-1`} /></label>
					<label className="text-xs text-slate-400">Run time<input type="time" value={runTime} onChange={e => setRunTime(e.target.value)} className={`${input} block mt-1`} /></label>
					<label className="text-xs text-slate-400">Timezone<input value={timezone} onChange={e => setTimezone(e.target.value)} className={`${input} block mt-1 w-44`} /></label>
					<button onClick={createPlan} disabled={!!busy} className={`${btn} bg-amber-600 hover:bg-amber-500 text-white py-2`}>
						{busy === 'create' ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Build plan with AI
					</button>
				</div>
			</div>

			{/* Plan list */}
			{plans.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{plans.map(p => (
						<button key={p.id} onClick={() => setSelectedId(p.id)}
							className={`px-3 py-2 rounded-xl text-left border text-xs transition-colors ${selectedId === p.id ? 'border-amber-500 bg-amber-600/10' : 'border-slate-800 bg-slate-900 hover:border-slate-600'}`}>
							<span className="block text-sm font-semibold text-white truncate max-w-[220px]">{p.name}</span>
							<span className="text-slate-500">{p.days.length} days · {p.startDate} </span>
							<span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLE[p.status]}`}>{p.status}</span>
						</button>
					))}
				</div>
			)}

			{plan && (
				<div className="space-y-4">
					{/* Plan header */}
					<div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5 space-y-4">
						<div className="flex flex-wrap items-center gap-3 justify-between">
							<div className="flex items-center gap-2 min-w-0">
								<input value={plan.name} onChange={e => editPlan({ name: e.target.value })} className={`${input} font-bold text-white w-56 max-w-full`} />
								<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLE[plan.status]}`}>{plan.status}</span>
							</div>
							<div className="flex flex-wrap gap-2">
								{dirty && <button onClick={savePlan} disabled={!!busy} className={`${btn} bg-slate-700 hover:bg-slate-600 text-white`}>{busy === 'save' ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save changes</button>}
								{plan.status === 'active'
									? <button onClick={() => setStatus('pause')} disabled={!!busy} className={`${btn} bg-amber-600/20 text-amber-300 hover:bg-amber-600/30`}><Pause size={13} /> Pause</button>
									: plan.status !== 'completed' && <button onClick={() => setStatus('activate')} disabled={!!busy} className={`${btn} bg-emerald-600 hover:bg-emerald-500 text-white`}>{busy === 'activate' ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Activate</button>}
								<button onClick={() => genTemplates(false)} disabled={!!busy} className={`${btn} bg-slate-800 hover:bg-slate-700 text-slate-200`}>{busy === 'tpl' ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />} AI email templates</button>
								<button onClick={deletePlan} disabled={!!busy} className={`${btn} text-rose-400 hover:bg-rose-600/10`}><Trash2 size={13} /> Delete</button>
							</div>
						</div>
						<div className="flex flex-wrap items-end gap-3">
							<label className="text-xs text-slate-400">Start date<input type="date" value={plan.startDate} onChange={e => editPlan({ startDate: e.target.value })} className={`${input} block mt-1`} /></label>
							<label className="text-xs text-slate-400">Run time<input type="time" value={plan.runTime} onChange={e => editPlan({ runTime: e.target.value })} className={`${input} block mt-1`} /></label>
							<label className="text-xs text-slate-400">Timezone<input value={plan.timezone} onChange={e => editPlan({ timezone: e.target.value })} className={`${input} block mt-1 w-44`} /></label>
							<label className="flex items-center gap-2 text-xs text-slate-300 pb-2"><input type="checkbox" checked={plan.notifyEmail} onChange={e => editPlan({ notifyEmail: e.target.checked })} /> Email me after every run</label>
						</div>
						<div className="flex gap-2">
							<input value={instruction} onChange={e => setInstruction(e.target.value)} onKeyDown={e => e.key === 'Enter' && refine()}
								placeholder='Ask AI to change the plan, e.g. "make day 3 schools in Texas" or "add salons on day 6"' className={`${input} flex-1`} />
							<button onClick={refine} disabled={!!busy || !instruction.trim()} className={`${btn} bg-amber-600 hover:bg-amber-500 text-white`}>{busy === 'refine' ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Edit with AI</button>
						</div>
					</div>

					{/* Days */}
					<div className="space-y-2">
						{plan.days.map(d => (
							<div key={d.index} className="bg-slate-900 border border-slate-800 rounded-xl p-3 md:p-4">
								<div className="flex flex-wrap items-center gap-2 md:gap-3">
									<div className="w-20 shrink-0">
										<p className="text-sm font-bold text-white flex items-center gap-1"><CalendarDays size={13} className="text-amber-500" />Day {d.index + 1}</p>
										<p className="text-[10px] text-slate-500">{d.date}</p>
									</div>
									<input value={d.niche} disabled={locked(d)} onChange={e => editDay(d.index, { niche: e.target.value })} placeholder="Niche (hotel)" className={`${input} w-36`} />
									<input value={d.location} disabled={locked(d)} onChange={e => editDay(d.index, { location: e.target.value })} placeholder="Location" className={`${input} w-36`} />
									<input type="number" min={1} max={2000} value={d.targetEmails} disabled={locked(d)} onChange={e => editDay(d.index, { targetEmails: parseInt(e.target.value) || 0 })} className={`${input} w-20`} title="Emails wanted" />
									<select value={d.providers[0] || 'trustpilot'} disabled={locked(d)}
										onChange={e => editDay(d.index, { providers: [e.target.value, ...d.providers.filter(p => p !== e.target.value)] })} className={input} title="First source; the others are used as fallbacks">
										{PROVIDERS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
									</select>
									<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLE[d.status]}`}>{d.status}</span>
									{d.status !== 'pending' && <span className="text-xs text-slate-400">{d.found}/{d.targetEmails} found · {d.sent} sent{d.failed > 0 && ` · ${d.failed} failed`}</span>}
									<div className="ml-auto flex items-center gap-1.5">
										{['pending', 'partial', 'failed', 'missed'].includes(d.status) && (
											<button onClick={() => runDay(d.index)} disabled={!!busy} className={`${btn} bg-slate-800 hover:bg-slate-700 text-slate-200`}>
												{busy === `run${d.index}` ? <Loader2 size={13} className="animate-spin" /> : d.status === 'pending' ? <Play size={13} /> : <RefreshCw size={13} />} {d.status === 'pending' ? 'Run now' : 'Retry'}
											</button>
										)}
										<button onClick={() => setExpanded(expanded === d.index ? null : d.index)} className={`${btn} text-slate-300 hover:bg-slate-800`}>
											<Mail size={13} /> Email {d.subject && <Check size={12} className="text-emerald-400" />} {expanded === d.index ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
										</button>
									</div>
								</div>
								{d.providerStats && Object.keys(d.providerStats).length > 0 && (
									<p className="text-[11px] text-slate-500 mt-2">Sources: {Object.entries(d.providerStats).map(([k, v]) => `${k} ${v}`).join(' · ')}</p>
								)}
								{d.lastError && <p className="text-[11px] text-amber-400 mt-1">{d.lastError}</p>}
								{expanded === d.index && (
									<div className="mt-3 space-y-2 border-t border-slate-800 pt-3">
										<div className="flex flex-wrap items-center gap-2">
											<select value="" disabled={locked(d) || templates.length === 0}
												onChange={e => applyTemplate(d.index, e.target.value)} className={`${input} min-w-[220px]`}>
												<option value="">{templates.length === 0 ? 'No saved templates yet' : 'Use a saved template…'}</option>
												{templates.map(t => <option key={t.id} value={t.id}>{t.name}{t.category ? ` (${t.category})` : ''}</option>)}
											</select>
											<select value="" disabled={locked(d) || templates.length === 0}
												onChange={e => applyTemplate(d.index, e.target.value, true)} className={`${input} min-w-[220px]`}>
												<option value="">Apply a saved template to all days…</option>
												{templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
											</select>
											<span className="text-[11px] text-slate-500">Copies the template into this day; you can still edit it below.</span>
										</div>
										<input value={d.subject} disabled={locked(d)} onChange={e => editDay(d.index, { subject: e.target.value })} placeholder="Subject" className={`${input} w-full`} />
										<div className="rounded-lg bg-slate-950 border border-slate-800 p-2.5">
											<p className="text-[11px] text-slate-400 mb-1.5">
												Variables are filled from each lead's data. If a lead has no value, the fallback shown is used instead. You can also write your own: <code className="text-amber-400">{'{{city|your area}}'}</code>
											</p>
											<div className="flex flex-wrap gap-1.5">
												{TEMPLATE_VARS.map(v => (
													<button key={v.key} type="button" disabled={locked(d)} onClick={() => insertVar(d.index, v.key)}
														title={`${v.desc}${v.fallback ? ` · fallback: "${v.fallback}"` : ' · blank if missing'}`}
														className="px-2 py-1 rounded-md bg-slate-800 hover:bg-amber-600/30 text-[11px] text-slate-200 disabled:opacity-50">
														<span className="font-mono text-amber-300">{`{{${v.key}}}`}</span>
														<span className="text-slate-500 ml-1">{v.fallback ? `→ ${v.fallback}` : ''}</span>
													</button>
												))}
											</div>
										</div>
										<div className="flex flex-wrap items-center gap-1.5">
											{[false, true].map(isPrev => (
												<button key={String(isPrev)} onClick={() => setPreview(p => ({ ...p, [d.index]: isPrev }))}
													className={`${btn} ${!!preview[d.index] === isPrev ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
													{isPrev ? 'Preview' : 'Edit HTML'}
												</button>
											))}
											{preview[d.index] && (
												<label className="flex items-center gap-1.5 text-[11px] text-slate-300 ml-2">
													<input type="checkbox" checked={!!simMissing[d.index]} onChange={e => setSimMissing(p => ({ ...p, [d.index]: e.target.checked }))} />
													Simulate a lead with missing data
												</label>
											)}
										</div>
										{preview[d.index] ? (
											<div className="rounded-lg overflow-hidden border border-slate-700 bg-white">
												<div className="px-3 py-2 bg-slate-100 border-b border-slate-200 text-xs text-slate-600">
													<span className="font-semibold">Subject:</span> {d.subject ? fillSample(d.subject, d, !!simMissing[d.index]) : <em>(empty)</em>}
												</div>
												{d.bodyHtml
													? <iframe title={`Day ${d.index + 1} preview`} sandbox="" srcDoc={fillSample(d.bodyHtml, d, !!simMissing[d.index])} className="w-full h-80 bg-white" />
													: <p className="p-4 text-sm text-slate-500">This day has no email body yet.</p>}
											</div>
										) : (
										<textarea id={`body-${d.index}`} value={d.bodyHtml} disabled={locked(d)} onChange={e => editDay(d.index, { bodyHtml: e.target.value })} rows={7}
											placeholder="Email body (HTML). Use {{name}}, {{company}}, {{city}}, {{niche}}, {{website}}" className={`${input} w-full font-mono text-xs resize-y`} />
										)}
										<label className="flex items-center gap-2 text-xs text-slate-300">
											<input type="checkbox" checked={d.autoSend} disabled={locked(d) || !d.subject || !d.bodyHtml} onChange={e => editDay(d.index, { autoSend: e.target.checked })} />
											Send automatically after leads are found (open and click tracking is always on)
										</label>
									</div>
								)}
							</div>
						))}
					</div>

					{/* Run history */}
					{runs.length > 0 && (
						<div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-5">
							<p className="text-sm font-semibold text-white mb-3 flex items-center gap-2"><Plus size={14} className="text-amber-500" />Execution history</p>
							<div className="space-y-1.5">
								{runs.map(r => (
									<div key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-300 border-b border-slate-800/60 pb-1.5">
										<span className="text-slate-500 w-36">{new Date(r.startedAt).toLocaleString()}</span>
										<span className="font-semibold text-white">Day {r.dayIndex + 1} · {r.niche}, {r.location}</span>
										<span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${STATUS_STYLE[r.status]}`}>{r.status}</span>
										<span>{r.found}/{r.target} found{r.reused > 0 && ` (${r.reused} from shared pool)`} · {r.sent} sent · {r.failed} failed</span>
										{r.message && <span className="text-amber-400">{r.message}</span>}
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			)}

			{toast && (
				<div className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white shadow-xl max-w-sm ${toast.ok ? 'bg-emerald-600' : 'bg-rose-600'}`}>
					{toast.ok && <Check size={14} />}{toast.msg}
				</div>
			)}
		</div>
	);
}
