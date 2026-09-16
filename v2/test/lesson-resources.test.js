import test from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../src/db.js';
import {seedHmenaFramework} from '../src/hmena-curriculum.js';
import {seedCurriculumLocalizations} from '../src/curriculum-localization.js';
import {seedHmenaCourse0800} from '../src/hmena-course.js';
import {seedHmenaCourse1200} from '../src/hmena-course-1200.js';
import {seedLessonResources,lessonTeachingPack,teachingPacksOverview,lessonExerciseRows} from '../src/lesson-resources.js';

function setup(){
  const db=openDatabase(':memory:');
  seedHmenaFramework(db);seedCurriculumLocalizations(db);seedHmenaCourse0800(db);seedHmenaCourse1200(db);seedLessonResources(db);
  return db;
}

test('0-1200 has one teach-ready base exercise per canonical lesson',()=>{
  const db=setup();
  assert.equal(lessonExerciseRows.length,30);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lesson_exercises').get().n,30);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM lesson_exercise_localizations').get().n,60);
  assert.equal(teachingPacksOverview(db,{locale:'en'}).length,30);
  db.close();
});

test('teaching pack localizes one canonical lesson without duplicating evidence',()=>{
  const db=setup();
  const en=lessonTeachingPack(db,'LESSON-HMENA-1200-L01',{locale:'en'});
  const es=lessonTeachingPack(db,'LESSON-HMENA-1200-L01',{locale:'es'});
  assert.equal(en.lesson.id,es.lesson.id);
  assert.notEqual(en.lesson.title,es.lesson.title);
  assert.equal(en.exerciseSet.length,1);assert.equal(es.exerciseSet.length,1);
  assert.notEqual(en.exerciseSet[0].prompt,es.exerciseSet[0].prompt);
  assert.equal(en.timeline.length,6);assert.equal(es.timeline.length,6);
  assert.ok(en.coachScript.length>=4);assert.ok(es.commonErrors.length>=2);
  assert.equal(en.teachingStatus,'teach-ready-v1');
  db.close();
});
