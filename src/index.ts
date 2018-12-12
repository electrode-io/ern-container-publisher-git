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
      log.debug(`Cloning git repository(${url}) to ${workingGitDir}`)
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
      await git.add(subdir ? subdir : './*')
      await git.commit(`Container v${containerVersion}`)
      const tagsOptions = allowVersionOverwrite ? ['-f'] : []
      await git.tag([`v${containerVersion}`, ...tagsOptions])
      await git.push('origin', branch)
      await git.push(['origin', '--tags', ...tagsOptions])
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
}
