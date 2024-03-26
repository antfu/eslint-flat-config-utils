# eslint-flat-config-utils

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

Utils for managing and manipulating ESLint flat config arrays

[Documentation](https://jsr.io/@antfu/eslint-flat-config-utils/doc)

## Install

```bash
npm i eslint-flat-config-utils
```

```ts
// eslint.config.mjs
import { conact, defineFlatConfig, renamePluginsInConfigs } from 'eslint-flat-config-utils'

export default conact(
  // configs...
)
```

## Sponsors

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2023-PRESENT [Anthony Fu](https://github.com/antfu)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/eslint-flat-config-utils?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/eslint-flat-config-utils
[npm-downloads-src]: https://img.shields.io/npm/dm/eslint-flat-config-utils?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/eslint-flat-config-utils
[bundle-src]: https://img.shields.io/bundlephobia/minzip/eslint-flat-config-utils?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=eslint-flat-config-utils
[license-src]: https://img.shields.io/github/license/antfu/eslint-flat-config-utils.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/antfu/eslint-flat-config-utils/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/eslint-flat-config-utils
