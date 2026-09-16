import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {seedHmenaFramework} from '../src/hmena-curriculum.js';
import {seedHmenaCourse0800,course0800Overview} from '../src/hmena-course.js';

test('HMENA 0-800 course seeds 20 canonical bilingual lessons',()=>{
  const db=openDatabase(':memory:');seedHmenaFramework(db);const result=seedHmenaCourse0800(db);seedHmenaCourse0800(db);
  assert.deepEqual(result,{lessons:20,foundations:10,development:10,locales:['en','es']});
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lessons WHERE id LIKE 'LESSON-HMENA-%'").get().n,20);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM curriculum_localizations WHERE entity_type='lesson' AND entity_id LIKE 'LESSON-HMENA-%'").get().n,40);
  assert.ok(db.prepare('SELECT COUNT(*) AS n FROM lesson_skills').get().n>20);
  db.close();
});

test('course keeps one lesson identity while resolving English or Spanish content',()=>{
  const db=openDatabase(':memory:');seedHmenaFramework(db);seedHmenaCourse0800(db);
  const en=course0800Overview(db,'en'),es=course0800Overview(db,'es');
  assert.equal(en.length,20);assert.equal(es.length,20);assert.equal(en[0].id,es[0].id);
  assert.equal(en[0].title,'Board Coordinates & Piece Movement');assert.equal(es[0].title,'Coordenadas del tablero y movimiento de piezas');
  assert.notEqual(en[0].content.activity,es[0].content.activity);
  db.close();
});
