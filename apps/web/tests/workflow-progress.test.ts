import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveWorkflowStages } from '../lib/workflow-progress.ts';

test('disconnected workflow truthfully starts at portfolio', () => {
  assert.deepEqual(deriveWorkflowStages({ portfolio: 'waiting', target: 'pending', decision: 'pending', preview: 'idle' }).map((stage) => stage.state), ['current', 'pending', 'pending', 'pending']);
});

test('wait and blocked decisions do not claim a completed preview', () => {
  assert.deepEqual(deriveWorkflowStages({ portfolio: 'completed', target: 'completed', decision: 'wait', preview: 'idle' }).map((stage) => stage.state), ['completed', 'completed', 'current', 'blocked']);
  assert.deepEqual(deriveWorkflowStages({ portfolio: 'completed', target: 'completed', decision: 'blocked', preview: 'idle' }).map((stage) => stage.state), ['completed', 'completed', 'blocked', 'blocked']);
});

test('preview completes only after the current simulation completes', () => {
  assert.equal(deriveWorkflowStages({ portfolio: 'completed', target: 'completed', decision: 'completed', preview: 'idle' })[3]?.state, 'current');
  assert.equal(deriveWorkflowStages({ portfolio: 'completed', target: 'completed', decision: 'completed', preview: 'completed' })[3]?.state, 'completed');
});
