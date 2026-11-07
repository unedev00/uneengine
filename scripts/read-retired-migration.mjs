import {readFileSync} from 'node:fs';

const baselines=['0001-initial-schema.sql','0002-current-platform.sql']
 .map(name=>readFileSync(new URL('../apps/server/src/system-support/migrations/'+name,import.meta.url),'utf8'));

/** Read the unchanged SQL fragment for a retired migration in smoke/contract tests. */
export function readRetiredMigration(name) {
 if(!/^(?:\d{3,4}|\d{8})-[a-z0-9-]+\.sql$/.test(name))
  throw new Error('Invalid retired migration name: '+name);
 const start='-- BEGIN LEGACY '+name+'\n',end='-- END LEGACY '+name+'\n';
 for(const sql of baselines) {
  const from=sql.indexOf(start);
  if(from<0)continue;
  const until=sql.indexOf(end,from+start.length);
  if(until<0)throw new Error('Unterminated retired migration: '+name);
  return sql.slice(from+start.length,until);
 }
 throw new Error('Retired migration not found: '+name);
}
