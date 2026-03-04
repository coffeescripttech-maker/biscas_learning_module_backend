const data = require('../exports/data/vark_modules.json');
const fs = require('fs');

const lesson2 = data.find(x => x.title && x.title.includes('Lesson 2'));

if (!lesson2) {
  console.log('Lesson 2 not found!');
  process.exit(1);
}

console.log('Lesson 2 ID:', lesson2.id);
console.log('Lesson 2 title:', lesson2.title);
console.log('\nTop-level keys:', Object.keys(lesson2).sort().join(', '));

// Check content_structure
if (lesson2.content_structure) {
  console.log('\ncontent_structure type:', typeof lesson2.content_structure);
  
  if (lesson2.content_structure.sections) {
    console.log('Number of sections:', lesson2.content_structure.sections.length);
    
    lesson2.content_structure.sections.forEach((section, i) => {
      const keys = Object.keys(section);
      console.log(`\nSection ${i+1} (${section.title || 'Untitled'}):`);
      console.log('  Keys:', keys.join(', '));
      
      // Check for simulation field
      if (keys.includes('simulation')) {
        console.log('  ⚠️  HAS SIMULATION FIELD!');
        console.log('  Simulation value:', section.simulation);
      }
    });
  }
}

// Save lesson 2 data to file for inspection
fs.writeFileSync(
  'server/scripts/lesson2-debug.json',
  JSON.stringify(lesson2, null, 2)
);

console.log('\n✅ Lesson 2 data saved to: server/scripts/lesson2-debug.json');
