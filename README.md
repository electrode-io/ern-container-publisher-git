# Electrode Native Git Container Publisher

This publisher can be used to publish Android and iOS Electrode Native Containers to a remote git repository. The git repository provider should not matter (GitHub, BitBucket, TFS ...).

The target git remote repository must exist. It will not be created by this publisher.

For example, For initial publication to GitHub, a repository should be created in GitHub beforehand.

When using this publisher, you might notice that a `raw` branch is created along the default `master` one. This branch is used by Electrode Native to store untransformed containers (raw generated containers before any transformer has been applied). Also, `raw-[version]` tags are created for each container version published through this publisher, in addition to the `[version]` tag.

Having access to untransformed container versions can be useful if you need to debug or alter some transformers, but it is mostly used by Electrode Native itself to perform some Container generation optimizations such as only regenerating the JS bundle if possible. In that case, Electrode Native needs access to the pre-transformed/raw Container because it still has to run transformers, but cannot run them over an already transformed Container.

## Usage

### **With `ern publish-container` CLI command**

**Required**

- `--url/-u` : Url of the remote git repository (SSH or HTTPS) to publish to
- `--publisher/-p` : `git`
- `--platform` : `android` | `ios`

**Optional**

- `--containerPath` : Path to the Container to publish.  
Defaults to the Electrode Native default Container Generation path (`~/.ern/containergen/out/[platform]` if not changed through config)

- `--containerVersion/-v` : Version of the Container to publish.  
Default to `1.0.0`

- `branch` : The name of the branch to publish to.  
Default to `master`

 The `ern publish-container` CLI command can be used as follow to manually publish a Container using the git publisher :

```bash
$ ern publish-container --containerPath [pathToContainer] -p git -u [gitRepoUrl] -v [containerVersion] ---platform [android|ios] -e '{"branch":"[branch_name]"}'
```

- `subdir` : The name of the subdirectory you want to publish to

```bash
$ ern publish-container --containerPath [pathToContainer] -p git -u [gitRepoUrl] -v [containerVersion] ---platform [android|ios] -e '{"subdir":"[subdirectory]"}'
```

- `allowVersionOverwrite` : A boolean flag to allow overwriting the version (tag). Defaults to false.

```bash
$ ern publish-container --containerPath [pathToContainer] -p git -u [gitRepoUrl] -v [containerVersion] ---platform [android|ios] -e '{"allowVersionOverwrite": true}'
```

### **With Cauldron**

**Required**

- `--publisher/-p` : `git`
- `--url/-u` : Url of the remote git repository (SSH or HTTPS) to publish to

**Optional**

- `branch` : The name of the branch to publish to.  
Please note that the branch needs to be created manually before hand in the remote repo.
Defaults to `master`

To automatically publish Cauldron generated Containers of a target native application and platform, the `ern cauldron add publisher` command can be used as follow :

```bash
$ ern cauldron add publisher -p git -u [gitRepoUrl] -e '{"branch":"[branch_name]"}'
```

This will result in the following publisher entry in Cauldron :

```json
{
  "name": "git",
  "url": "[gitRepoUrl]",
  "extra": {
    "branch": "[branch_name]"
  }
}
```

This is only needed once. Once the configuration for the publisher is stored in Cauldron, any new Cauldron generated Container will be publihsed to git.

### **Programatically**

```js
import GitPublisher from 'ern-container-publisher-git'
const publisher = new GitPublisher()
publisher.publish({
  /* Local file system path to the Container */
  containerPath,
  /* Version of the Container. Will result in a git tag. */
  containerVersion,
  /* Remote git repository url (ssh or https) */
  url,
  /* Extra config specific to this publisher */
  extra?: {
    /* Name of the branch to publish to */
    branch?: string
  }
})
```

