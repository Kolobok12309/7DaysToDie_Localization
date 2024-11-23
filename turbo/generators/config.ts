import type { PlopTypes } from '@turbo/gen';

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
    // perform actions based on the prompts
    actions: [
      {
        type: 'add',
        path: 'locales/{{name}}/package.json',
        templateFile: '../../locales/_template/package.json'
      },
    ],
  });
}