import {rmSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
// Compiled output is disposable: never reuse stale JS or obsolete SQL migrations.
rmSync(fileURLToPath(new URL('../dist-system/',import.meta.url)),{recursive:true,force:true});
