import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	Database, ArrowLeft, Crown, LogOut, Menu, X, Search, Sparkles, Rocket
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUrlTab } from '@/hooks/useUrlTab';
import { LeadsExtractorTab } from './leads/LeadsExtractorTab';
import { LeadsDatabaseTab } from './leads/LeadsDatabaseTab';
import { LeadsAutopilotTab } from './leads/LeadsAutopilotTab';
import { LeadsPlannerTab } from './leads/LeadsPlannerTab';

type Tab = 'extractor' | 'planner' | 'database' | 'autopilot';

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
	{ id: 'extractor', label: 'Lead Extractor',  icon: <Sparkles size={20} />,   desc: 'Automated scraping' },
	{ id: 'planner',   label: 'Campaign Planner', icon: <Rocket size={20} />,     desc: 'Multi-day auto campaigns' },
	{ id: 'database',  label: 'Leads Database',  icon: <Database size={20} />,   desc: 'Browse & contact leads' },
	{ id: 'autopilot', label: 'AI Auto Pilot',   icon: <Search size={20} />,     desc: 'Automate outreach & follow-up' },
];

const TAB_IDS = NAV_ITEMS.map(n => n.id);

const TAB_LABELS: Record<Tab, string> = {
	extractor: 'Lead Extractor',
	planner: 'Campaign Planner',
	database: 'Leads Database',
	autopilot: 'AI Auto Pilot',
};

export function LeadsPage() {
	const [tab, handleTabChange] = useUrlTab(TAB_IDS, 'extractor', 'leads_active_tab');
	const [drawerOpen, setDrawerOpen] = useState(false);
	const { user, logout } = useAuth();
	const navigate = useNavigate();

	// isPaid check can be integrated for premium locking if needed

	const SidebarContent = () => (
		<>
			{/* Brand */}
			<div className="px-4 pt-5 pb-4 border-b border-slate-800">
				<button
					onClick={() => navigate('/app')}
					className="flex items-center gap-2 text-slate-400 hover:text-white text-xs mb-4 transition-colors"
				>
					<ArrowLeft size={14} />
					<span>Back to Dashboard</span>
				</button>
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg animate-pulse">
						<Search size={17} className="text-white" />
					</div>
					<div>
						<p className="text-white font-bold text-sm leading-none">Leads Manager</p>
						<p className="text-slate-400 text-xs mt-0.5">Scrape & Enrich</p>
					</div>
				</div>
			</div>

			{/* Nav */}
			<nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
				{NAV_ITEMS.map(item => (
					<button
						key={item.id}
						onClick={() => { handleTabChange(item.id); setDrawerOpen(false); }}
						className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
							tab === item.id
								? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
								: 'text-slate-400 hover:text-white hover:bg-slate-800'
						}`}
					>
						<span className={`transition-transform ${tab === item.id ? 'scale-110' : 'group-hover:scale-105'}`}>
							{item.icon}
						</span>
						<div>
							<p className="text-sm font-semibold leading-none">{item.label}</p>
							<p className={`text-[10px] mt-0.5 ${tab === item.id ? 'text-amber-200' : 'text-slate-500'}`}>{item.desc}</p>
						</div>
					</button>
				))}
			</nav>

			{/* User info */}
			<div className="p-4 border-t border-slate-800 flex items-center justify-between gap-3">
				<div className="flex items-center gap-2.5 min-w-0">
					<div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shadow-inner shrink-0">
						{user?.name?.charAt(0).toUpperCase()}
					</div>
					<div className="min-w-0">
						<p className="text-white text-xs font-semibold truncate leading-none">{user?.name}</p>
						<span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-500 uppercase mt-0.5 tracking-wider">
							<Crown size={10} className="shrink-0" />
							{user?.subscription?.plan || 'trial'}
						</span>
					</div>
				</div>
				<button
					onClick={() => { logout(); navigate('/'); }}
					title="Logout"
					className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-colors"
				>
					<LogOut size={15} />
				</button>
			</div>
		</>
	);

	return (
		<div className="min-h-screen bg-slate-950 flex font-sans antialiased text-slate-200">
			{/* Desktop Sidebar */}
			<aside className="hidden md:flex md:w-56 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
				<SidebarContent />
			</aside>

			{/* Mobile Header / Sidebar Drawer */}
			<div className="flex-1 flex flex-col min-w-0">
				<header className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10 sticky top-0">
					<div className="flex items-center gap-3">
						<button
							onClick={() => setDrawerOpen(true)}
							className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
						>
							<Menu size={20} />
						</button>
						<span className="text-white font-bold text-sm">{TAB_LABELS[tab]}</span>
					</div>
					<button
						onClick={() => navigate('/app')}
						className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
					>
						<ArrowLeft size={18} />
					</button>
				</header>

				{/* Mobile Drawer Overlay */}
				{drawerOpen && (
					<div className="fixed inset-0 z-40 md:hidden flex">
						<div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
						<aside className="relative flex w-56 max-w-xs bg-slate-900 flex-col h-full z-50 border-r border-slate-800">
							<button
								onClick={() => setDrawerOpen(false)}
								className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
							>
								<X size={18} />
							</button>
							<SidebarContent />
						</aside>
					</div>
				)}

				{/* Main Workspace Pane */}
				<main className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-950">
					<div className="max-w-6xl mx-auto space-y-6">
						{tab === 'extractor' && <LeadsExtractorTab />}
						{tab === 'planner' && <LeadsPlannerTab />}
						{tab === 'database' && <LeadsDatabaseTab />}
						{tab === 'autopilot' && <LeadsAutopilotTab />}
					</div>
				</main>
			</div>
		</div>
	);
}
export default LeadsPage;
