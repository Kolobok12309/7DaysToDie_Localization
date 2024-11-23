import { resolve, basename } from 'node:path';
import { readdir, readFile } from 'node:fs/promises';

import { getGamePath } from 'steam-game-path';

const GAME_ID = 251570;
const DEFAULT_GAME_NAME = '7 Days to Die';

export interface ModInfo {
  name: string;
  path: string;
  localizationPath: string | null;
}
export interface GameInfo {
  path: string;
  mods: ModInfo[];
}
export interface GetInfoResult {
  active: GameInfo | null;
  all: GameInfo[];
}

const scanSteamLib = async (libFolder: string): Promise<string[]> => {
  const games = await readdir(resolve(libFolder, 'common'));

  return games
    // Hide hidden files, .DS_Store for example
    .filter((name) => !name.startsWith('.'))
    .map((name) => resolve(libFolder, 'common', name));
}

export const scanGame = async (gameFolder: string): Promise<string[]> => {
  try {
    const mods = await readdir(resolve(gameFolder, 'mods'));

    return mods
      // Hide hidden files, .DS_Store for example
      .filter((name) => !name.startsWith('.'))
      .map((name) => resolve(gameFolder, 'mods', name));
  } catch (err) {
    if (err.code === 'ENOENT') return [];

    console.error(err);
    return [];
  }
};

export const getModLocalizationPath = async (modFolder: string): Promise<string | null> => {
  try {
    const localizationPath = resolve(modFolder, 'Config', 'Localization.txt');

    await readFile(localizationPath)

    return localizationPath;
  } catch (err) {
    if (err.code === 'ENOENT') return null;

    console.error(err);
    return null;
  }
};

export const getGamesInfo = async (): Promise<GetInfoResult> => {
  const result: GetInfoResult = {
    active: null,
    all: [],
  };

  const gameInfo = await getGamePath(GAME_ID);

  if (gameInfo) {
    const { game, steam } = gameInfo;
    const gameNames = [DEFAULT_GAME_NAME.toLowerCase()];

    if (game) gameNames.push(game.name.toLowerCase());

    await Promise.all(steam.libraries.map(async (libFolder) => {
      const games = await scanSteamLib(libFolder);
      const validGames = games
        .filter((gameFolder) => gameNames
          .some((validName) => basename(gameFolder)
            .toLowerCase()
            .startsWith(validName)
          )
        );

      await Promise.all(validGames.map(async (gameFolder) => {
        const mods = await scanGame(gameFolder);
        const formattedMods = await Promise.all(mods.map(async (modFolder): Promise<ModInfo> => ({
          name: basename(modFolder),
          path: modFolder,
          localizationPath: await getModLocalizationPath(modFolder),
        })));

        const gameInfo = {
          path: gameFolder,
          mods: formattedMods,
        };

        if (game?.path === gameFolder) {
          result.active = gameInfo
        }

        result.all.push(gameInfo);
      }));
    }));
  }

  return result;
};
