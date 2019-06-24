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

const kc = new k8s.KubeConfig()
kc.loadFromCluster()
server = kc.getCurrentCluster().server

console.log('SERVER: ', server)

const certFile = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'
let hasCert = false
try {
    if (fs.existsSync(certFile)) {
        hasCert = true
    }
} catch(e) {
    console.error(e)
}

function deleteBuild(buildName, server) {
    url = `${server}/apis/build.knative.dev/v1alpha1/namespaces/default/builds/${buildName}`
    const options = {url}
    if (hasCert) {
        options.cert = fs.readFileSync(certFile)
        console.log(`CERT_FILE: ${options.cert}`)
    }
    request.delete(options, (error, response, body) => {
        if (error) {
            console.log(`error: ${error}`);
        }
        if (response) {
            console.log(`statusCode: ${response.statusCode}`);
        }
        console.log(`body: ${body}`);
    })
}

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

// first delete an existing build (if existing)
//deleteBuild(buildName, server)

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
