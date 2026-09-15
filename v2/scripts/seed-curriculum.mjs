import {openDatabase} from '../src/db.js';
import {seedSeedsCurriculum} from '../src/curriculum.js';
const db=openDatabase();
try{console.log(JSON.stringify(seedSeedsCurriculum(db)));}
finally{db.close();}
