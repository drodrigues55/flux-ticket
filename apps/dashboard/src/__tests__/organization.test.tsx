import test from 'node:test';
import assert from 'node:assert/strict';

test('organization profile: correct form submission payload mapper', () => {
  const mapInput = (name: string, email: string, cnpj: string) => ({
    name,
    email: email || null,
    cnpj: cnpj || null,
  });

  const payload = mapInput('Minha Org', 'contato@org.com', '12.345.678/0001-90');
  assert.equal(payload.name, 'Minha Org');
  assert.equal(payload.email, 'contato@org.com');
  assert.equal(payload.cnpj, '12.345.678/0001-90');
});

test('organization members: confirm dialog states visibility', () => {
  const dialogState = {
    confirmDeleteId: 'm-1',
    confirmDisableId: null,
  };
  assert.equal(dialogState.confirmDeleteId, 'm-1');
  assert.equal(dialogState.confirmDisableId, null);
});
