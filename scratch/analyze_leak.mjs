import fs from 'fs';

const content = fs.readFileSync('scratch/all_funcs.txt', 'utf-8');
const sections = content.split('========================================\nFUNCTION: ');

for (const sec of sections) {
  if (!sec.trim()) continue;
  const name = sec.substring(0, sec.indexOf('\n'));
  const body = sec.substring(sec.indexOf('\n') + 1);

  console.log(`\n>>> ANALYZING: ${name}`);
  
  // Find all SELECT statements from profiles or members
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('profiles') || line.includes('members') || line.includes('INSERT INTO public.notifications') || line.includes('INSERT INTO notifications')) {
      console.log(`  L${i+1}: ${line.trim()}`);
    }
  }
}
