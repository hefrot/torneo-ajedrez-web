import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCsv,reconcileIdentityRows} from '../src/history-import.js';

test('CSV parser preserves quoted commas and newlines',()=>{assert.deepEqual(parseCsv('a,b\n1,"two,three"\n2,"line\nnext"\n'),[{a:'1',b:'two,three'},{a:'2',b:'line\nnext'}]);});
test('identity reconciliation auto-merges exact stable IDs but never names alone',()=>{const result=reconcileIdentityRows({legacyPlayers:[{id:1,full_name:'Same Name',lichess_username:'ExactUser'},{id:2,full_name:'Same Name',lichess_username:'DifferentUser'}],mkMembers:[{id:10,display_name:'Other Name',chesscom_username:'ClubUser',wa_user_id:'111@s.whatsapp.net'}],mkIdentities:[{player_id:10,platform:'lichess',username_normalized:'exactuser'}],auditPlayers:[]});assert.equal(result.groups.length,2);assert.equal(result.entityCanonical.get('legacy:1'),result.entityCanonical.get('mk:10'));assert.notEqual(result.entityCanonical.get('legacy:1'),result.entityCanonical.get('legacy:2'));});
