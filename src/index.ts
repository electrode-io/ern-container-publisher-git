import { ContainerPublisher } from 'ern-container-publisher'
import { createTmpDir, gitCli, shell, log, NativePlatform } from 'ern-core'
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
    extra
  }: {
    containerPath: string
    containerVersion: string
    url?: string,
    extra?: {
      branch?: string
    }
  }) {
    const workingGitDir = createTmpDir()
    const branch = (extra && extra.branch) || 'master'

    if (!url) {
      throw new Error('url is required')
    }

    try {
      shell.pushd(workingGitDir)
      const git = gitCli()
      log.debug(`Cloning git repository(${url}) to ${workingGitDir}`)
      await gitCli().clone(url, '.')
      const branchResult = await git.branch({}) 
      const branches = branchResult.all
      if (!branches.includes(branch)) {
        await git.checkoutLocalBranch(branch)
      }
      await git.checkout(branch)
      await git.pull('origin', branch)
      shell.rm('-rf', `${workingGitDir}/*`)
      shell.cp('-Rf', path.join(containerPath, '{.*,*}'), workingGitDir)
      await git.add('./*')
      await git.commit(`Container v${containerVersion}`)
      await git.tag([`v${containerVersion}`])
      await git.push('origin', branch)
      await git.pushTags('origin')
      log.info('[=== Completed publication of the Container ===]')
      log.info(`[Publication url : ${url}]`)
      log.info(`[Git Branch: ${branch}]`)
      log.info(`[Git Tag: v${containerVersion}]`)
    } finally {
      shell.popd()
    }
  }
}
