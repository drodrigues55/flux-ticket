import test from 'node:test';
import assert from 'node:assert/strict';

// Dashboard component-level validation state mock checks
function checkPublishState(blockersCount: number, warningsCount: number) {
  const isPublishEnabled = blockersCount === 0;
  return {
    isPublishEnabled,
    message: isPublishEnabled
      ? (warningsCount > 0 ? 'Ready with warnings' : 'Ready to publish')
      : 'Cannot publish: resolve blockers first',
  };
}

function handleSaveFailure(response: any): { errorText: string; requestId: string } {
  return {
    errorText: response.error?.message || 'Erro desconhecido no servidor',
    requestId: response.meta?.requestId || response.error?.requestId || 'req_unknown',
  };
}

// Test cases
test('publishing is disabled when blockers exist', () => {
  const state = checkPublishState(2, 1);
  assert.equal(state.isPublishEnabled, false);
  assert.equal(state.message, 'Cannot publish: resolve blockers first');
});

test('publishing is enabled with warnings only', () => {
  const state = checkPublishState(0, 3);
  assert.equal(state.isPublishEnabled, true);
  assert.equal(state.message, 'Ready with warnings');
});

test('save draft failure maps response error and extracts requestId', () => {
  const errorResponse = {
    error: {
      message: 'Slug duplicado no sistema',
      requestId: 'req-abc-123',
    }
  };
  const result = handleSaveFailure(errorResponse);
  assert.equal(result.errorText, 'Slug duplicado no sistema');
  assert.equal(result.requestId, 'req-abc-123');
});
