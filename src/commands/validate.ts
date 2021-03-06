import * as Ajv from 'ajv';
import axios from 'axios';
import * as chalk from 'chalk';
import { readFileSync } from 'fs';
import * as glob from 'glob';
import { resolve } from 'path';

interface ValidateOptions {
  root?: string,
  files: string;
}

export const validate = ({ files: globFiles, root }: ValidateOptions): void => {
  const schemaRoot = root ?? process.cwd();
  console.error('Search for files matching', globFiles, 'in', root);
  glob(globFiles, { cwd: schemaRoot, nodir: true }, (err, paths) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    if (paths.length === 0) {
      console.error(chalk.redBright('ERROR'), 'No matching files found');
      process.exit(1);
    }

    Promise.all(paths.map((path) => validateFile(path, schemaRoot)))
      .then((results) => {
        const allValid = results.reduce((acc, valid) => acc && valid, true);
        if (!allValid) {
          console.error(chalk.redBright('Some files were invalid'));
          process.exit(1);
        }
        console.error(chalk.green('All files were valid'));
      }).catch((err) => {
        console.error(err);
        process.exit(1);
      });
  });
};

const REGEX_WEB = /^https?:\/\//;
const validateFile = async (file: string, baseDir: string): Promise<boolean> => {
  const schema = JSON.parse(readFileSync(resolve(baseDir, file)).toString()) as Record<string, unknown>;

  const loadSchema = async (uri: string): Promise<Record<string, unknown> | boolean> => {
    if (REGEX_WEB.test(uri)) {
      const result = await axios.get(uri);
      if (result.status >= 400) { throw new Error(`Loading error: ${result.status}`); }
      return result.data as Record<string, unknown>;
    } else if (REGEX_WEB.test(baseDir)) {
      const result = await axios.get(uri, { baseURL: baseDir });
      if (result.status >= 400) { throw new Error(`Loading error: ${result.status}`); }
      return result.data as Record<string, unknown>;
    } else {
      const path = resolve(baseDir, uri);
      return JSON.parse(readFileSync(path).toString()) as Record<string, unknown>;
    }
  };

  try {
    const ajv = new Ajv({ loadSchema });
    const validate = await ajv.compileAsync(schema);
    if (typeof validate === 'function') {
      console.log(file, chalk.green('VALID'));
    } else {
      console.error(file, chalk.red('ERROR'), 'failed to compile to a function', validate);
      return false;
    }
  } catch (err) {
    if (!(err instanceof Error)) throw err;
    console.error(file, chalk.redBright('INVALID'), err.message);
    return false;
  }
  return true;
};
