const k8s = require('@kubernetes/client-node')
const request = require('request')
const fs = require('fs')

// Docker repo conf
const dockerRepo = 'docker.io'
const dockerRepoUser = 'petari'

// Git repo conf
const gitRepo = 'https://github.com/petari21'

const buildName = 'kaniko-build'

const appName = 'app1'

let tf = null
try {
    tf = fs.readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/token')
    console.log('Found token file: ', tf)
} catch(e) {
    console.log('No token file')
}

const kc = new k8s.KubeConfig()
kc.loadFromCluster()
server = kc.getCurrentCluster().server

console.log('SERVER: ', server)

function buildImageFromSource(appName, sourceRevision, imageName, tagName, buildName) {
    const build = {}

    build.apiVersion = 'build.knative.dev/v1alpha1'
    build.kind = 'Build'
    build.metadata = {}
    build.metadata.name = buildName
    build.spec = {}
    build.spec.serviceAccountName = 'build-bot'
    build.spec.source = {}
    build.spec.source.git = {}
    build.spec.source.git.url = `${gitRepo}/${appName}.git`
    build.spec.source.git.revision = sourceRevision
    build.spec.template = {}
    build.spec.template.name = 'kaniko'
    build.spec.template.arguments = [
        {
            name: 'IMAGE',
            value: `${dockerRepo}/${dockerRepoUser}/${imageName}:${tagName}`
        }
    ]

    return build
}

// construct build call
build = buildImageFromSource(appName, 'master', appName, 'build', buildName)

// send build call
url = `${server}/apis/build.knative.dev/v1alpha1/namespaces/default/builds`
buildYaml = k8s.dumpYaml(build)

const options = {
    body: buildYaml,
    headers: {
        'Content-Type': 'application/yaml',
    }
}

const opts = {}
kc.applyToRequest(opts)

Object.assign(opts, options)

if (tf) {
    options.headers['Authorization'] = `Bearer ${tf}`
}

console.log('passing opts: ', opts)
request.post(url, opts, (error, response, body) => {
    if (error) {
        console.log(`error: ${error}`);
    }
    if (response) {
        console.log(`statusCode: ${response.statusCode}`);
    }
    console.log(`body: ${body}`);
})
