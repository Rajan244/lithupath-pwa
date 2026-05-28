import { useEffect } from 'react';
import { useAppStore } from './store';
import { seedDatabaseIfEmpty } from './seed';
import BottomNav from './components/BottomNav';
import TodayTab from './components/TodayTab';
import LearnTab from './components/LearnTab';
import PracticeTab from './components/PracticeTab';
import ProgressTab from './components/ProgressTab';

function App() {
  const { isSeeding, setIsSeeding, activeTab } = useAppStore();

  useEffect(() => {
    async function init() {
      await seedDatabaseIfEmpty();
      setIsSeeding(false);
    }
    init();
  }, [setIsSeeding]);

  if (isSeeding) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <h2 className="mt-4 text-xl font-display text-primary">Preparing LithuPath...</h2>
          <p className="text-sm text-text/70 mt-2">Loading your 30-day syllabus</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-background overflow-hidden">
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20 hide-scrollbar">
        {activeTab === 'Today' && <TodayTab />}
        {activeTab === 'Learn' && <LearnTab />}
        {activeTab === 'Practice' && <PracticeTab />}
        {activeTab === 'Progress' && <ProgressTab />}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav />
    </div>
  );
}

export default App;
