import fs from 'fs';

const content = fs.readFileSync('scratch/triggers_dump.txt', 'utf-8');
const lines = content.split('\n');
for (const line of lines) {
  if (line.startsWith('TRIGGER:')) {
    console.log(line);
  }
}
