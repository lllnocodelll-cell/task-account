import fs from 'fs';

const content = fs.readFileSync('scratch/all_funcs.txt', 'utf-8');
const sections = content.split('========================================\nFUNCTION: ');

for (const sec of sections) {
  const name = sec.substring(0, sec.indexOf('\n'));
  if (['notify_new_task', 'notify_task_reassignment', 'notify_new_client'].includes(name)) {
    console.log(`\n================== ${name} ==================`);
    console.log(sec);
  }
}
