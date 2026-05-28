import { Home, Gamepad2, BarChart3 } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '../store';

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex flex-col items-center justify-center w-16 h-full transition-colors",
        isActive ? "text-primary" : "text-gray-400 hover:text-gray-600"
      )}
    >
      <div className={clsx("mb-1", isActive && "stroke-[2.5px]")}>{icon}</div>
      <span className={clsx("text-[10px] font-medium", isActive && "font-bold")}>
        {label}
      </span>
    </button>
  );
}

export default function BottomNav() {
  const { activeTab, setActiveTab } = useAppStore();
  
  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full bg-white border-t border-gray-200 safe-area-pb">
      <div className="flex h-16 justify-around items-center px-2">
        <NavItem icon={<Home className="w-5 h-5" />} label="Today" isActive={activeTab === 'Today'} onClick={() => setActiveTab('Today')} />
        <NavItem icon={<Gamepad2 className="w-5 h-5" />} label="Practice" isActive={activeTab === 'Practice'} onClick={() => setActiveTab('Practice')} />
        <NavItem icon={<BarChart3 className="w-5 h-5" />} label="Stats" isActive={activeTab === 'Progress'} onClick={() => setActiveTab('Progress')} />
      </div>
    </nav>
  );
}
