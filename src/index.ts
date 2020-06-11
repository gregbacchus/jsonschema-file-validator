import { program } from 'commander';
import { validate } from './commands/validate';

program
  .description('Validate JSON Schema files')
  .requiredOption('-f, --files <glob>', 'Glob of files to validate')
  .option('-r, --root <path>', 'Schema root directory, used as base for search and for resolving refs')
  .action(validate);

program.parse(process.argv);
