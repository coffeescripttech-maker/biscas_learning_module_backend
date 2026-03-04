const data = require('../exports/data/vark_modules.json');

data.forEach((m, i) => {
  if (m.hasOwnProperty('simulation')) {
    console.log(`Module ${i+1} (${m.title}) has simulation field:`, m.simulation);
  }
  
  // Check all top-level keys
  console.log(`Module ${i+1} (${m.title}) keys:`, Object.keys(m).length);
});
