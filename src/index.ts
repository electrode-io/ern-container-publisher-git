import { ContainerPublisher } from 'ern-container-publisher'
import { createTmpDir, gitCli, shell, log, NativePlatform } from 'ern-core'
import fs from 'fs'
import path from 'path'

export default class GitPublisher implements ContainerPublisher {
  get name(): string {
    return 'git'
  }

  get platforms(): NativePlatform[] {
    return ['android', 'ios']
  }

  public async publish({
    containerPath,
    containerVersion,
    url,
    platform,
    extra,
  }: {
    containerPath: string
    containerVersion: string
    url?: string,
    platform: string,
    extra?: {
      branch?: string,
      subdir?: string,
      allowVersionOverwrite?: boolean
    }
  }) {
    const workingGitDir = createTmpDir()
    const branch = (extra && extra.branch) || 'master'
    const subdir = (extra && extra.subdir) || ''
    const allowVersionOverwrite = (extra && extra.allowVersionOverwrite) || false

    if (!url) {
      throw new Error('url is required')
    }

    try {
      shell.pushd(workingGitDir)
      const git = gitCli()
      log.debug(`Cloning Git repository(${url}) to ${workingGitDir}`)
      await gitCli().clone(url, '.')
      const branchResult = await git.branch(['-a'])
      const branches = branchResult.all
      if (!branches.includes(`remotes/origin/${branch}`)) {
        await git.checkoutLocalBranch(branch)
      } else {
        await git.checkout(branch)
        await git.pull('origin', branch)
      }
      const projectDir = path.join(workingGitDir, subdir);
      shell.rm('-rf', path.join(projectDir, '*'))
      if (subdir) {
        // Normally that wouldn't be needed as the -f in cp should create the folder if it does not exist
        // but that is not working somehow in shelljs
        shell.mkdir(projectDir)
      }
      shell.cp('-Rf', path.join(containerPath, '{.*,*}'), projectDir)
      if (platform === 'ios') {
        this.patchContainerInfoPlistWithVersion({containerPath: projectDir, containerVersion})
      }
      await git.add(subdir ? subdir : './*')
      await git.commit(`Container v${containerVersion}`)
      const tagsOptions = allowVersionOverwrite ? ['-f'] : []
      await git.tag([`v${containerVersion}`, ...tagsOptions])
      await git.push('origin', branch)
      await git.raw(['push', 'origin', '--tags', ...tagsOptions])
      log.info('[=== Completed publication of the Container ===]')
      log.info(`[Publication url : ${url}]`)
      log.info(`[Git Branch: ${branch}]`)
      if (subdir) {
        log.info(`[Subdirectory : ${subdir}]`)
      }
      log.info(`[Git Tag: v${containerVersion}]`)
    } finally {
      shell.popd()
    }
  }

  /**
   * [iOS Specific]
   * Patch ElectrodeContainer Info.plist to update CFBundleShortVersionString
   * with the Container version being published
   */
  public patchContainerInfoPlistWithVersion({
    containerPath,
    containerVersion
  } : {
    containerPath: string,
    containerVersion: string
  }) {
    const infoPlistPath = path.join(containerPath, 'ElectrodeContainer', 'Info.plist')
    if (fs.existsSync(infoPlistPath)) {
      const infoPlist = fs.readFileSync(infoPlistPath).toString()
      const patchedInfoPlist = infoPlist.replace(
        new RegExp('<key>CFBundleShortVersionString<\/key>\\n\\t<string>.+<\/string>'),
        `<key>CFBundleShortVersionString</key>\n\t<string>${containerVersion.replace('-raw', '')}</string>`)
      fs.writeFileSync(infoPlistPath, patchedInfoPlist)
    }
  }
}
