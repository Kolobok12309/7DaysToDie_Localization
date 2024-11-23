import { resolve } from 'node:path';
import { readdir } from 'node:fs/promises';

import type { PlopTypes } from '@turbo/gen';

import { getGamesInfo, type GameInfo, type ModInfo } from './import';

export default function generator(plop: PlopTypes.NodePlopAPI): void {
  plop.setGenerator('locale', {
    description: 'Create locale',

    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Localization mod name',
      },
    ],

    actions: [
      {
        type: 'add',
        path: 'locales/{{name}}/package.json',
        templateFile: '../../locales/_template/package.json'
      },
    ],
  });

  plop.setGenerator('import-locale', {
    description: 'Import locale from game folder',

    prompts: async (inquirer) => {
      const { active, all: allGames } = await getGamesInfo();

      const { game } = await inquirer.prompt<{
        game: GameInfo;
      }>([
        {
          type: 'list',
          name: 'game',
          message: 'Select game',
          default: active,
          choices: allGames.map((game) => {
            const { path, mods } = game;
            const modsWithLocalization = mods
              .filter(({ localizationPath }) => localizationPath);

            return {
              name: `${path} (mods ${modsWithLocalization.length}/${mods.length})`,
              value: game,
              disabled: !game.mods.length
            };
          }),
        },
      ]);

      const { mods, targetFolder } = await inquirer.prompt<{
        mods: ModInfo[];
        targetFolder: string;
      }>([
        {
          type: 'checkbox',
          name: 'mods',
          message: 'Select mod',
          loop: false,
          choices: game.mods.map((mod) => {
            return {
              name: mod.name,
              value: mod,
              disabled: !mod.localizationPath,
            };
          }),
          validate: (mods) => {
            if (!mods.length)
              return 'Select 1 or more mods';

            return true;
          },
        },
        {
          type: 'input',
          name: 'targetFolder',
          message: 'Target folder for importing',
          transformer: (folder) => `locales/${folder}`,
          validate: async (folder) => {
            const fullPath = resolve('locales', folder);

            try {
              await readdir(fullPath);

              return true;
            } catch (err) {
              if (err.code === 'ENOENT') return 'Folder not exists';

              return err.message;
            }
          },
        }
      ]);

      return {
        mods,
        targetFolder: resolve('locales', targetFolder),
      };
    },

    // @ts-expect-error
    actions: ({ mods, targetFolder }: {
      mods: ModInfo[];
      targetFolder: string;
    }) => {
      return mods.map(({ name, localizationPath }) => ({
        type: 'add',
        path: resolve(targetFolder, `${name}.csv`),
        templateFile: localizationPath,
      }));
    },
  });
}