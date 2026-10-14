export type WorkflowStageState = 'completed' | 'current' | 'blocked' | 'pending';
export type PreviewProgress = 'idle' | 'loading' | 'completed' | 'blocked';

export interface WorkflowStage {
  id: 'portfolio' | 'target' | 'decision' | 'preview';
  label: string;
  state: WorkflowStageState;
}

export function deriveWorkflowStages(input: {
  portfolio: 'waiting' | 'completed' | 'blocked';
  target: 'pending' | 'completed' | 'blocked';
  decision: 'pending' | 'wait' | 'completed' | 'blocked';
  preview: PreviewProgress;
}): WorkflowStage[] {
  const portfolio = input.portfolio === 'waiting' ? 'current' : input.portfolio;
  const target = input.target;
  const decision = input.decision === 'wait' ? 'current' : input.decision;
  const preview = input.decision === 'completed'
    ? input.preview === 'completed' ? 'completed' : input.preview === 'blocked' ? 'blocked' : 'current'
    : input.decision === 'blocked' || input.decision === 'wait' ? 'blocked' : 'pending';
  return [
    { id: 'portfolio', label: 'Portfolio', state: portfolio },
    { id: 'target', label: 'Target', state: target },
    { id: 'decision', label: 'Decision', state: decision },
    { id: 'preview', label: 'Preview', state: preview },
  ];
}
