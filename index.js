const k8s = require('@kubernetes/client-node');
const request = require('request');
const fs = require('fs')

// Docker repo conf
const dockerRepo = 'docker.io'
const dockerRepoUser = 'petari'

// Git repo conf
const gitRepo = 'https://github.com/petari21'

const buildName = 'kaniko-build'

const kc = new k8s.KubeConfig();
kc.loadFromDefault();
server = kc.getCurrentCluster().server

function deleteBuild(buildName, server) {
    url = `${server}/apis/build.knative.dev/v1alpha1/namespaces/default/builds/${buildName}`
    request.delete(url, (error, response, body) => {
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

const certFile = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'
try {
    if (fs.existsSync(certFile)) {
        require('https').globalAgent.options.ca = require(certFile).create()
    }
} catch(e) {
    console.error(e)
}

const appName = 'app1'

// first delete an existing build (if existing)
deleteBuild(buildName, server)

// construct build call
build = buildImageFromSource(appName, 'master', appName, 'build', buildName)

// send build call
url = `${server}/apis/build.knative.dev/v1alpha1/namespaces/default/builds`
buildYaml = k8s.dumpYaml(build)
request.post({
        url,
        body: buildYaml,
        headers: {
            'Content-Type': 'application/yaml',
        }
    }, (error, response, body) => {
    if (error) {
        console.log(`error: ${error}`);
    }
    if (response) {
        console.log(`statusCode: ${response.statusCode}`);
    }
    console.log(`body: ${body}`);
})
