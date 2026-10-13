import { ActivityJournal } from '@/features/activity/activity-journal';

export default function ActivityPage() {
  return (
    <div className="page">
      <header className="page-title"><span className="eyebrow">Your activity</span><h1>What you asked for. What actually happened.</h1><p>This browser keeps the wallet actions started here and checks their real Monad receipts. A simulation is never presented as a trade.</p></header>
      <ActivityJournal />
    </div>
  );
}
