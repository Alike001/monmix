import { ActivityJournal } from '@/features/activity/activity-journal';

export default function ActivityPage() {
  return (
    <div className="page">
      <header className="page-title"><span className="eyebrow">03 · Activity</span><h1>Every state needs evidence.</h1><p>This browser journal records wallet requests before submission, persists transaction hashes, and reconciles receipts with Kuru Trade events. Simulation alone never appears as a trade.</p></header>
      <ActivityJournal />
    </div>
  );
}
