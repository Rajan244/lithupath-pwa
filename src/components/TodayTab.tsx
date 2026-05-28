import { useLiveQuery } from 'dexie-react-hooks';
import { Play, Flame, ShieldAlert, ArrowRight, Target } from 'lucide-react';
import { db } from '../db';
import { useAppStore } from '../store';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function TodayTab() {
  // 1. Get user settings (or default to Day 1)
  const settings = useLiveQuery(() => db.user_settings.get('local_user'));
  const currentDay = settings?.current_day || 1;

  // Ensure settings exist
  if (settings === undefined) {
    db.user_settings.get('local_user').then(s => {
      if (!s) db.user_settings.put({ user_id: 'local_user', current_day: 1 });
    });
  }

  // 2. Get all progress items
  const allProgress = useLiveQuery(() => db.user_item_progress.where('user_id').equals('local_user').toArray());

  // 3. Get course items for the current day
  const dayItems = useLiveQuery(() => 
    db.course_items.where('day').equals(currentDay).toArray()
  , [currentDay]);

  // Calculations
  const now = new Date().toISOString();
  
  // A. Due Reviews: any past items where next_review_at is in the past
  const dueReviews = allProgress?.filter(p => p.next_review_at && p.next_review_at <= now) || [];
  const reviewIds = dueReviews.map(p => p.item_id);

  // B. New Items: items from today that have NO progress record yet
  const progressIds = new Set(allProgress?.map(p => p.item_id) || []);
  const newItems = dayItems?.filter(item => !progressIds.has(item.item_id)) || [];
  const newItemIds = newItems.map(i => i.item_id);

  // C. Today's items progress stats
  const todayProgress = allProgress?.filter(p => dayItems?.some(d => d.item_id === p.item_id)) || [];
  const weakItemsCount = todayProgress.filter(p => p.score < 7).length;
  
  // D. Today's Learning Progress Bar
  const totalItems = dayItems?.length || 0;
  const completedItems = todayProgress.filter(p => p.score >= 7).length || 0;
  const progressPercent = totalItems === 0 ? 0 : Math.round((completedItems / totalItems) * 100);

  // E. Practice queue stats (globally weak + today's unseen for practice indicator)
  const allWeak = allProgress?.filter(p => p.score < 7) || [];
  const practiceNeeded = allWeak.length + newItemIds.length;
  const totalSeen = allProgress?.length || 0;
  
  const missionQueue = [...reviewIds, ...newItemIds];
  
  const handleAdvanceDay = async () => {
    if (settings) {
      await db.user_settings.put({ ...settings, current_day: currentDay + 1 });
    } else {
      await db.user_settings.put({ user_id: 'local_user', current_day: currentDay + 1 });
    }
  };

  return (
    <div className="px-6 pt-12 pb-6 min-h-full max-w-lg mx-auto">
      <header className="mb-6">
        <h2 className="text-text/70 font-medium uppercase tracking-wider text-sm mb-1">{getGreeting()}</h2>
        <h1 className="text-3xl font-display text-primary font-bold">Day {currentDay}</h1>
        <p className="text-lg text-secondary mt-1">Build your Lithuanian core</p>
      </header>

      {/* Today's Learning Progress Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-sm font-bold text-primary">Today's Learning</span>
            <p className="text-xs text-text/50 mt-0.5">{completedItems} of {totalItems} words mastered</p>
          </div>
          <span className="text-2xl font-display font-bold text-accent">{progressPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div 
            className="bg-primary h-3 rounded-full transition-all duration-500" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Practice Progress Bar */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-6">
        <div className="flex justify-between items-center mb-3">
          <div>
            <span className="text-sm font-bold text-primary flex items-center">
              <Target className="w-4 h-4 mr-1.5 text-secondary" />
              Practice Queue
            </span>
            <p className="text-xs text-text/50 mt-0.5">
              {practiceNeeded > 0 
                ? `${practiceNeeded} items need practice (${allWeak.length} weak + ${newItemIds.length} new)`
                : 'All caught up! Nothing to practice'}
            </p>
          </div>
          <button
            onClick={() => useAppStore.getState().setActiveTab('Practice')}
            className="text-xs font-bold text-secondary bg-secondary/10 px-3 py-1.5 rounded-lg hover:bg-secondary/20 transition-colors"
          >
            Go Practice
          </button>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div 
            className="bg-secondary h-3 rounded-full transition-all duration-500" 
            style={{ width: practiceNeeded === 0 ? '100%' : `${Math.max(5, Math.round((totalSeen / Math.max(totalSeen + practiceNeeded, 1)) * 100))}%` }}
          ></div>
        </div>
      </div>

      {/* Main Action Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-4">
        <h3 className="text-xl font-display font-bold text-text mb-2">Today's Mission</h3>
        
        {missionQueue.length > 0 ? (
          <>
            <div className="flex space-x-4 text-sm text-text/70 mb-6">
              <div className="flex items-center"><Flame className="w-4 h-4 mr-1 text-accent" /> {newItemIds.length} new</div>
              <div className="flex items-center"><Play className="w-4 h-4 mr-1 text-secondary" /> {reviewIds.length} due review</div>
            </div>
            <button 
              onClick={() => {
                useAppStore.getState().setSessionQueue(missionQueue);
              }}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg hover:bg-primary/90 transition-colors shadow-md">
              Start Mission
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <p className="text-status-strong font-bold mb-4">Mission Accomplished!</p>
            <button 
              onClick={handleAdvanceDay}
              className="w-full flex items-center justify-center bg-accent text-white py-4 rounded-xl font-bold text-lg hover:bg-accent/90 transition-colors shadow-md">
              Advance to Day {currentDay + 1} <ArrowRight className="w-5 h-5 ml-2" />
            </button>
          </div>
        )}
      </div>

      {/* Weak Items Rescue */}
      {weakItemsCount > 0 && (
        <div className="bg-red-50 rounded-2xl p-6 border border-red-100 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center text-status-weak font-bold mb-4">
            <ShieldAlert className="w-5 h-5 mr-2" />
            <h3>Weak Core Words</h3>
          </div>
          <button 
            onClick={() => {
              const weakIds = todayProgress.filter(p => p.score < 7).map(p => p.item_id);
              useAppStore.getState().setSessionQueue(weakIds);
            }}
            className="w-full bg-white text-status-weak border-2 border-status-weak py-3 rounded-xl font-bold hover:bg-red-100 transition-colors">
            Rescue {weakItemsCount} weak words
          </button>
        </div>
      )}
    </div>
  );
}
