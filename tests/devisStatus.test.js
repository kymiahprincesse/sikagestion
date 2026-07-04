import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDevisStatut, isDevisEnAttente, isDevisVisibleDansListe } from '../src/utils/devisStatus.js';

test('normalise les statuts de devis en attente', () => {
  assert.equal(normalizeDevisStatut('En attente'), 'EN_ATTENTE');
  assert.equal(normalizeDevisStatut('BROUILLON'), 'BROUILLON');
  assert.equal(normalizeDevisStatut('Validé'), 'VALIDE');
});

test('considère les devis brouillon et en attente comme en attente', () => {
  assert.equal(isDevisEnAttente('BROUILLON'), true);
  assert.equal(isDevisEnAttente('EN_ATTENTE'), true);
  assert.equal(isDevisEnAttente('VALIDE'), false);
});

test('n’inclut pas les devis sans type dans la liste visible', () => {
  assert.equal(isDevisVisibleDansListe({ statut: 'EN_ATTENTE' }), false);
  assert.equal(isDevisVisibleDansListe({ statut: 'EN_ATTENTE', type: 'CALORIFUGE' }), true);
  assert.equal(isDevisVisibleDansListe({ statut: 'BROUILLON', typeDevis: 'PLIAGE' }), true);
});
