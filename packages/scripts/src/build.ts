import process from 'node:process';
import { resolve, basename } from 'node:path';
import { copyFile, readFile, mkdir, rm } from 'node:fs/promises';

import { zip } from 'zip-a-folder';
import { glob } from 'glob';

const handleErrorWithMessage = async (msg: string, cb: Function) => {
  try {
    await cb();
  } catch (err) {
    console.error(msg);
    throw err;
  }
};

const main = async () => {
  await handleErrorWithMessage('Error while delete previous dist folder', async () => {
    await rm('dist', { recursive: true, force: true });
  });

  await handleErrorWithMessage('Error while delete previous dist folder', async () => {
    await rm('dist.zip', { force: true });
  });

  await handleErrorWithMessage('Error while create dist folder', async () => {
    await mkdir('dist');
  });

  let ignoreFileContent: string;

  await handleErrorWithMessage('Error while read ignore file', async () => {
    try {
      ignoreFileContent = await readFile('.ignore', { encoding: 'utf-8' });
    } catch (err) {
      if ((err as any).code === 'ENOENT') {
        ignoreFileContent = '';
        return;
      }

      throw err;
    }
  });

  let localizationFiles = [] as string[];

  await handleErrorWithMessage('Error while glob search', async () => {
    localizationFiles = await glob('*.csv', {
      ignore: ignoreFileContent.split('\n'),
    });
  });

  const folderNames = localizationFiles.map((fileName) => basename(fileName, '.csv'));

  await Promise.all(localizationFiles.map(async (fileName, index) => {
    const folderName = folderNames[index];

    await handleErrorWithMessage(`Error while create "${folderName}"`, async () => {
      await mkdir(resolve('dist', folderName));
    });

    await handleErrorWithMessage(`Error while create "${folderName}/Config"`, async () => {
      await mkdir(resolve('dist', folderName, 'Config'));
    });

    await handleErrorWithMessage(`Error while copy to "${folderName}/Config/Localization.txt"`, async () => {
      await copyFile(fileName, resolve('dist', folderName, 'Config', 'Localization.txt'));
    });
  }));

  await handleErrorWithMessage('Error while zipping', async () => {
    await zip('dist', 'dist.zip');
  });
}

main();