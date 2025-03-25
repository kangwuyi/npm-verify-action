# npm verify action

<p align="center">
  <a href="https://orcid.org/0009-0009-0993-7629"><img src="https://img.shields.io/badge/iD-0009--0009--0993--7629-f5f5f5" alt="Orcid"></a>
  <a href="https://ko-fi.com/kwy"><img src="https://badgen.net/badge/icon/kofi?icon=kofi&label=kwy&color=F16061" alt="Kwy"></a>

</p>

<p align="center">

![Depfu](https://img.shields.io/depfu/kangwuyi/npm-verify-action) ![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/kangwuyi/npm-verify-action) [![Code Coverage](https://img.shields.io/codecov/c/github/kangwuyi/npm-verify-action)](https://codecov.io/github/kangwuyi/npm-verify-action) [![Build Ci](https://github.com/kangwuyi/npm-verify-action/actions/workflows/test.yml/badge.svg)](https://github.com/kangwuyi/kangwuyi/npm-verify-action)

</p>

# Publish

This action verify npm version.

## Inputs

### `type`

**Required** type 可选值为 ['limited-cover'|'double-check']，'limited-cover' 为优先覆盖，当 Npm pkg@version 可删除时先执行删除，'double-check' 则是仅检查 Npm pkg@version 是否存在

### `registry`

registry 为 npm registry，默认值为 registry.npmjs.org

### `is-scope`

**Required** is-scope 可选值为 ['0'|'1']，'0' 表示不是私域，'1' 则为私域且必须设置 env 中的 NPM_TOKEN

## Envs

### NPM_TOKEN

npm token，在 npm 包平台申请

## Outputs

### exists

输出值范围为 ['0'|'1']，'0' 表示不存在 Npm pkg@version，'1' 表示已经存在 Npm pkg@version

## Example usage

```yaml
name: My workflow

on: push

jobs:
  my-job:
    name: My job
    runs-on: ubuntu-latest
  steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          registry-url: 'https://registry.npmjs.org'

      - name: Check publish status
        id: check
        uses: kangwuyi/npm-verify-action@v1
        with:
          type: 'double-check'
          registry: 'registry.npmjs.org'
          is-scope: '0'
        env:
          NPM_TOKEN: ${{secrets.NPM_TOKEN}}

      - name: Publish if necessary
        id: publish
        # whether ship it
        if: ${{ steps.check.outputs.exists == '0' }}
        run: npm ci

      - name: Report publish status
        if: ${{ steps.check.outputs.exists == '1' }}
        run: 'echo "package version already exists on npm registry"'

```

## local test
checkout test branch and push.
