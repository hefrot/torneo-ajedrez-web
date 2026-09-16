import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {seedHmenaCourse1200,course1200Overview} from '../src/hmena-course-1200.js';

test('HMENA 800-1200 seeds ten bilingual lessons covering competitive fundamentals',()=>{
  const db=openDatabase(':memory:');const seeded=seedHmenaCourse1200(db);
  assert.equal(seeded.lessons,10);
  const en=course1200Overview(db,'en'),es=course1200Overview(db,'es');
  assert.equal(en.length,10);assert.equal(es.length,10);
  assert.notEqual(en[0].title,es[0].title);
  const covered=db.prepare(`SELECT COUNT(DISTINCT cs.code) AS n FROM lesson_skills ls JOIN curriculum_skills cs ON cs.id=ls.skill_id WHERE ls.lesson_id LIKE 'LESSON-HMENA-1200-%'`).get().n;
  assert.equal(covered,12);db.close();
});
