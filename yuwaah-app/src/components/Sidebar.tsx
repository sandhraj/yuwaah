import type { NavTab, GSStatus } from '../types';

interface SidebarProps {
  navTab: NavTab;
  setNavTab: (tab: NavTab) => void;
  status: GSStatus;
  lastRefresh: Date | null;
  onRefresh: () => void;
  mobileOpen: boolean;
  onClose: () => void;
}

const navItems: { key: NavTab; icon: string; label: string; section: string }[] = [
  { key: 'funnel', icon: '📊', label: 'Pipeline funnel', section: 'Programme' },
  { key: 'sources', icon: '🗺', label: 'Source channels', section: 'Programme' },
  { key: 'conversions', icon: '📈', label: 'Conversion ratios', section: 'Programme' },
  { key: 'fieldops', icon: '👥', label: 'Field ops & roles', section: 'Team' },
  { key: 'matching', icon: '🔗', label: 'Employer matching', section: 'Employers' },
];

export function Sidebar({ navTab, setNavTab, status, lastRefresh, onRefresh, mobileOpen, onClose }: SidebarProps) {
  const sections = ['Programme', 'Team', 'Employers'];

  const statusText =
    status === 'live'
      ? 'Live · ' + lastRefresh?.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : status === 'error'
      ? 'Error — check sheet'
      : 'Connecting…';

  const dotClass =
    status === 'live'
      ? 'bg-green-500 shadow-[0_0_6px_#10b981]'
      : status === 'error'
      ? 'bg-red-500'
      : 'bg-white/30';

  const badgeClass =
    status === 'live'
      ? 'bg-green-900/20 text-green-300'
      : status === 'error'
      ? 'bg-red-900/20 text-red-300'
      : 'bg-white/5 text-white/40';

  return (
    <aside
      className={[
        'bg-[#070F1C] flex flex-col h-screen overflow-hidden border-r border-[#0F1E36]',
        // mobile: fixed overlay, slides in/out
        'fixed top-0 left-0 w-[220px] z-30 transition-transform duration-200 ease-in-out',
        // desktop: sticky in grid flow
        'md:sticky md:z-auto md:translate-x-0',
        mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
      ].join(' ')}
    >
      {/* Mobile close button */}
      <button
        className="md:hidden absolute top-3.5 right-3 p-1.5 text-white/40 hover:text-white/70 leading-none cursor-pointer border-none bg-transparent"
        onClick={onClose}
        aria-label="Close navigation"
      >
        ✕
      </button>

      <div className="px-5 py-6 border-b border-white/[0.08]">
        <div className="text-[15px] font-semibold text-white leading-tight">YuWaah Dashboard</div>
        <div className="text-[11px] text-white/45 mt-0.5">Sambhav Foundation · Migration Support</div>
      </div>

      <nav className="flex-1 px-2.5 py-3 flex flex-col gap-0.5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section}>
            <div className="text-[9px] font-semibold tracking-[0.1em] uppercase text-white/28 px-2.5 pt-2.5 pb-1">
              {section}
            </div>
            {navItems
              .filter((item) => item.section === section)
              .map((item) => (
                <button
                  key={item.key}
                  onClick={() => { setNavTab(item.key); onClose(); }}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-[13px] font-normal border-none cursor-pointer transition-all duration-150 text-left ${
                    navTab === item.key
                      ? 'bg-[#E8601C] text-white font-medium'
                      : 'bg-transparent text-white/55 hover:bg-white/[0.06] hover:text-white/85'
                  }`}
                >
                  <span className="text-base w-5 text-center flex-shrink-0">{item.icon}</span>
                  {item.label}
                </button>
              ))}
          </div>
        ))}
      </nav>

      <div className="px-2.5 py-3 border-t border-white/[0.08]">
        <div className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-[11px] ${badgeClass}`}>
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotClass}`} />
          <span>{statusText}</span>
        </div>
        <button
          onClick={onRefresh}
          className="btn btn-sm btn-ghost w-full justify-center mt-1.5"
        >
          ↻ Refresh data
        </button>
      </div>
    </aside>
  );
}
