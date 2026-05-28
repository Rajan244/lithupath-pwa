import { useLiveQuery } from 'dexie-react-hooks';
import { Target, Trash2 } from 'lucide-react';
import { db } from '../db';
import { useAppStore } from '../store';
import TypeBadge from './TypeBadge';

export default function ProgressTab() {
  const progressStats = useLiveQuery(async () => {
    const allProgress = await db.user_item_progress.toArray();
    const allItems = await db.course_items.toArray();
    
    const progressMap = new Map(allProgress.map(p => [p.item_id, p]));
    
    const stats: Record<string, { total: number; mastered: number; weak: number }> = {
      word: { total: 0, mastered: 0, weak: 0 },
      phrase: { total: 0, mastered: 0, weak: 0 },
      sentence: { total: 0, mastered: 0, weak: 0 },
      question: { total: 0, mastered: 0, weak: 0 },
      expression: { total: 0, mastered: 0, weak: 0 }
    };
    
    let totalWeak = 0;

    allItems.forEach(item => {
      const type = item.type || 'word';
      if (stats[type]) {
        stats[type].total++;
        const p = progressMap.get(item.item_id);
        if (p) {
          if (p.score >= 7) stats[type].mastered++;
          else if (p.score < 4) {
            stats[type].weak++;
            totalWeak++;
          }
        }
      }
    });

    const knownCount = allProgress.filter(p => p.score >= 7).length;
    const overallMastery = allItems.length === 0 ? 0 : Math.round((knownCount / allItems.length) * 100);

    return { stats, overallMastery, totalWeak };
  });

  const { stats, overallMastery, totalWeak } = progressStats || { 
    stats: {
      word: { total: 0, mastered: 0, weak: 0 },
      phrase: { total: 0, mastered: 0, weak: 0 },
      sentence: { total: 0, mastered: 0, weak: 0 },
      question: { total: 0, mastered: 0, weak: 0 },
      expression: { total: 0, mastered: 0, weak: 0 }
    },
    overallMastery: 0,
    totalWeak: 0
  };

  const renderTypeStat = (type: string) => {
    const data = stats[type];
    if (!data || data.total === 0) return null;
    
    const masteredPct = data.total === 0 ? 0 : Math.round((data.mastered / data.total) * 100);
    const weakPct = data.total === 0 ? 0 : Math.round((data.weak / data.total) * 100);

    return (
      <div key={type} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex justify-between items-center mb-3">
          <TypeBadge type={type} />
          <span className="text-xs font-bold text-text/50">{data.total} Total</span>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-end mb-1">
              <span className="text-xl font-bold text-status-strong">{data.mastered}</span>
              <span className="text-[10px] text-text/50 ml-1 mb-1 uppercase tracking-wider font-bold">Mastered</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-status-strong h-1.5 rounded-full" style={{ width: `${masteredPct}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex items-end mb-1">
              <span className="text-xl font-bold text-status-weak">{data.weak}</span>
              <span className="text-[10px] text-text/50 ml-1 mb-1 uppercase tracking-wider font-bold">Weak</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5">
              <div className="bg-status-weak h-1.5 rounded-full" style={{ width: `${weakPct}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Circumference = 2 * pi * r (where r = 36) => ~226
  const strokeDasharray = 226;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * overallMastery) / 100;

  return (
    <div className="px-6 pt-12 pb-6 min-h-full max-w-lg mx-auto">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-text/70 font-medium uppercase tracking-wider text-sm mb-1">Lithuanian Level</h2>
          <h1 className="text-3xl font-display text-primary font-bold">A1 Foundation</h1>
        </div>
        
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
            <circle 
              cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" 
              className="text-accent transition-all duration-1000 ease-out"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-display font-bold text-primary">{overallMastery}%</span>
          </div>
        </div>
      </header>

      <div className="mb-8">
        <h3 className="text-sm font-bold text-text/50 uppercase tracking-wider mb-4">Vocabulary Breakdown</h3>
        {renderTypeStat('word')}
        {renderTypeStat('phrase')}
        {renderTypeStat('sentence')}
        {renderTypeStat('question')}
        {renderTypeStat('expression')}
      </div>

      {/* Next Best Action */}
      <div className="bg-primary rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Target className="w-24 h-24" />
        </div>
        <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-2">Next Best Action</h3>
        <p className="text-xl font-medium mb-1">
          {totalWeak > 0 ? `Revise ${totalWeak} weak items` : 'Learn new vocabulary'}
        </p>
        <button 
          onClick={() => {
            useAppStore.getState().setActiveTab(totalWeak > 0 ? 'Practice' : 'Today');
          }}
          className="bg-white text-primary px-5 py-2 rounded-lg font-bold text-sm shadow-sm hover:bg-gray-50 transition-colors mt-2">
          {totalWeak > 0 ? 'Start Revision' : 'Start Learning'}
        </button>
      </div>

      <div className="mt-12 text-center pb-8">
        <button 
          onClick={async () => {
            if (window.confirm("Are you sure you want to completely wipe all your progress and start over as a brand new user?")) {
              await db.user_item_progress.clear();
              await db.user_settings.clear();
              window.location.reload();
            }
          }}
          className="inline-flex items-center text-red-500 font-bold text-sm opacity-50 hover:opacity-100 transition-opacity">
          <Trash2 className="w-4 h-4 mr-1.5" /> Reset All Progress
        </button>
      </div>
    </div>
  );
}
