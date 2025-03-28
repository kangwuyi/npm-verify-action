import * as core from '@actions/core'
import { existsSync } from 'fs'
import { join } from 'path'
import { fetch } from 'cross-fetch'
import exec from './util/exec.js'
import { createRequire } from 'module'
import os from 'os'

const require = createRequire(import.meta.url)

const TYPE_VALUES = {
  'double-check': 'double-check',
  'limited-cover': 'limited-cover',
}

const errorTypeCheck = (err) => (err instanceof Error ? err : new Error(JSON.stringify(err)))

const doubleCheck = async (registry, name, version) => {
  const url = `https://${registry}/${name}/${version}`
  const res = await fetch(url).catch((err) => errorTypeCheck(err))

  if (res instanceof Error || res.status === 404) return false

  const json = await res.json().catch((err) => errorTypeCheck(err))

  if (json instanceof Error) return false

  return json.version === version
}

// 加载文件
const parsePackageFile = (ws) => {
  const localFilePath = join(ws, 'package.json')
  if (!existsSync(localFilePath)) {
    throw new Error("package.json could not be found in your project's root.")
  }

  return require(localFilePath)
}

async function run() {
  try {
    const workspace = process.env.GITHUB_WORKSPACE
    if (!workspace) {
      throw new Error('action not being run in a valid github workspace')
    }
    core.info(`start parse local package.json`)
    // 解析项目本地 package 文件
    const { name, version } = parsePackageFile(workspace)
    // type = limited-cover 覆盖，如果存在相同版本则覆盖（如果时间限制之内可删除）
    // type = double-check 版本重复检查，重复则跳过
    const type = core.getInput('type')
    if (!type || !TYPE_VALUES[type]) {
      throw new Error(
        `输入的 ${type} 参数异常，可选值 double-check 版本重复检查, limited-cover 优先覆盖检查`,
      )
    }
    // 是否是作用域私有包
    const isScope = core.getInput('is-scope')
    const npmToken = process.env.NPM_TOKEN
    if ((isScope === '1' || type === TYPE_VALUES['limited-cover']) && !npmToken) {
      throw new Error('环境变量 NPM_TOKEN 没有设置!')
    }
    if (npmToken) core.exportVariable('NPM_TOKEN', process.env.NPM_TOKEN)
    //
    let registry = core.getInput('registry')
    if (!registry) registry = 'registry.npmjs.org'
    //
    core.info(`start check pkg version`)
    const isDoubleVersion = await doubleCheck(registry, name, version)

    // 不存在相同版本，结束进程
    if (!isDoubleVersion) {
      core.setOutput('exists', 0)
      core.info(`No equivalent version of npm exists, verify done!${os.EOL}`)
      process.exit(core.ExitCode.Success)
    }

    // 存在相同版本
    core.setOutput('exists', 1)
    //
    if (type === TYPE_VALUES['double-check']) {
      core.info(`Npm has the same version, verify done!${os.EOL}`)
      process.exit(core.ExitCode.Success)
    } else if (type === TYPE_VALUES['limited-cover']) {
      core.info(`start del same pkg version in online`)
      // 获取工具的路径并通过路径解析
      const npmPath = await io.which('npm', true)
      // 注册 registry
      await exec(npmPath, ['config', 'set', 'registry', `https://${registry}/`])
      await exec(npmPath, ['unpublish', `${name}@${version}`]).catch((err) => {
        core.warning(`Npm unpublish is err, ${err.message}`)
      })
    }
    // 结束进程
    process.exit(core.ExitCode.Success)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
    process.exit(core.ExitCode.Failure)
  }
}

run().catch((err) => core.setFailed(err.message))
