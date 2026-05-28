import { useLiveQuery } from 'dexie-react-hooks';
import { ShieldCheck, ShieldAlert, Target } from 'lucide-react';
import { db } from '../db';
import { useAppStore } from '../store';

export default function ProgressTab() {
  const progressStats = useLiveQuery(async () => {
    const allProgress = await db.user_item_progress.toArray();
    const allItems = await db.course_items.toArray();
    
    const progressMap = new Map(allProgress.map(p => [p.item_id, p]));
    
    // Binary system: score >= 7 = Known/Mastered, score < 7 = Weak
    // score 7 = "I know it", score 10 = "Too easy", score < 7 = forgot/almost/missed
    const stats = {
      words: { total: 0, mastered: 0, weak: 0 },
      sentences: { total: 0, mastered: 0, weak: 0 }
    };
    
    allItems.forEach(item => {
      const type = item.type === 'phrase' || item.type === 'grammar' ? 'sentences' : 'words';
      stats[type].total++;
      
      const p = progressMap.get(item.item_id);
      if (p) {
        if (p.score >= 7) stats[type].mastered++;
        else stats[type].weak++;
      }
      // Unseen (no progress record) = not yet started, don't count in either bucket
    });

    const knownCount = allProgress.filter(p => p.score >= 7).length;
    const overallMastery = allItems.length === 0 ? 0 : Math.round((knownCount / allItems.length) * 100);

    return { ...stats, overallMastery };
  });

  const stats = progressStats || { 
    words: { total: 0, mastered: 0, weak: 0 },
    sentences: { total: 0, mastered: 0, weak: 0 },
    overallMastery: 0 
  };

  const totalWeak = stats.words.weak + stats.sentences.weak;

  return (
    <div className="px-6 pt-12 pb-6 min-h-full max-w-lg mx-auto">
      <header className="mb-8">
        <h2 className="text-text/70 font-medium uppercase tracking-wider text-sm mb-1">Lithuanian Level</h2>
        <h1 className="text-3xl font-display text-primary font-bold">A1 Foundation</h1>
        <div className="flex items-center mt-2">
          <span className="text-4xl font-display font-bold text-accent">{stats.overallMastery}%</span>
          <span className="text-sm font-medium text-text/60 ml-3 uppercase tracking-wider">Overall Mastery</span>
        </div>
      </header>

      {/* Words Section */}
      <h3 className="text-lg font-display font-bold text-primary mb-3">Vocabulary ({stats.words.total} words)</h3>
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
          <div className="w-10 h-10 rounded-full bg-status-mastered/10 flex items-center justify-center mr-3">
            <ShieldCheck className="w-5 h-5 text-status-mastered" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{stats.words.mastered}</div>
            <div className="text-xs font-bold text-text/50 uppercase tracking-wider">Mastered</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
          <div className="w-10 h-10 rounded-full bg-status-weak/10 flex items-center justify-center mr-3">
            <ShieldAlert className="w-5 h-5 text-status-weak" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{stats.words.weak}</div>
            <div className="text-xs font-bold text-text/50 uppercase tracking-wider">Weak</div>
          </div>
        </div>
      </div>

      {/* Sentences Section */}
      <h3 className="text-lg font-display font-bold text-primary mb-3">Sentences ({stats.sentences.total} phrases)</h3>
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
          <div className="w-10 h-10 rounded-full bg-status-mastered/10 flex items-center justify-center mr-3">
            <ShieldCheck className="w-5 h-5 text-status-mastered" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{stats.sentences.mastered}</div>
            <div className="text-xs font-bold text-text/50 uppercase tracking-wider">Mastered</div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center">
          <div className="w-10 h-10 rounded-full bg-status-weak/10 flex items-center justify-center mr-3">
            <ShieldAlert className="w-5 h-5 text-status-weak" />
          </div>
          <div>
            <div className="text-2xl font-bold text-text">{stats.sentences.weak}</div>
            <div className="text-xs font-bold text-text/50 uppercase tracking-wider">Weak</div>
          </div>
        </div>
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

      <div className="mt-12 text-center">
        <button 
          onClick={async () => {
            if (window.confirm("Are you sure you want to completely wipe all your progress and start over as a brand new user?")) {
              await db.user_item_progress.clear();
              await db.user_settings.clear();
              window.location.reload();
            }
          }}
          className="text-red-500 font-bold text-sm opacity-50 hover:opacity-100 transition-opacity">
          Danger: Reset All Progress
        </button>
      </div>
    </div>
  );
}
