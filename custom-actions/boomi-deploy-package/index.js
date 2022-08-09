const core = require('@actions/core');
const axios = require('axios');
const base64 = require('base-64');
const fs = require('fs');

const BOOMI_REST_URL = core.getInput('BOOMI_REST_URL');
const BOOMI_TFA_ACCOUNTID = core.getInput('BOOMI_TFA_ACCOUNTID');
const BOOMI_REST_USERNAME = core.getInput('BOOMI_REST_USERNAME');
const BOOMI_REST_PASSWORD = core.getInput('BOOMI_REST_PASSWORD');
const BOOMI_PACKAGES_JSON = core.getInput('BOOMI_PACKAGES_JSON') || "boomi-packages.json";
const BOOMI_ENVIRONMENT_ID = core.getInput('BOOMI_ENVIRONMENT_ID');

const boomi_packages_file = "deployment-successful-packages.json";
const boomi_deployment_failed_packages_file = "deployment-failed-packages.txt";

let currentWorkignDir = process.cwd();
console.log(`Current Working Directoty: ${currentWorkignDir}`);
async function runAction() {
    let successfulPackages = []; 
    let hasFailures = false;

    try {
        let config = {
            method: 'post',
            url: `${BOOMI_REST_URL}/${BOOMI_TFA_ACCOUNTID}/DeployedPackage`,
            headers: getHeaders()
        };

        const packages = require(`${currentWorkignDir}/${BOOMI_PACKAGES_JSON}`)
        if(packages.length == 0){
            console.log("No packages to deploy");
            core.setFailed("No packages to deploy");
            return;
        }

        for (let index = 0; index < packages.length; index++) {
            let package = packages[index];
            let packageId = package.packageId
            let boomiPackageDeploy = {
                "packageId": packageId,
                "environmentId": BOOMI_ENVIRONMENT_ID,
                "notes": `packageId: ${packageId} deployment through GitHub Workflow`
            };

            try {
                config.data = boomiPackageDeploy;
                let response = await axios(config);
                console.log(`Response: ${response.data}`);
                let deploymentId = response.data.deploymentId;
                console.log(`deploymentId: ${deploymentId}`);
                let successfulPackage = {"packageId": packageId, "deploymentId": deploymentId};
                successfulPackages.push(successfulPackage);
            } catch (error) {
                hasFailures = true;               
                console.log(`Error: ${JSON.stringify(error.response.data)}`);
                let message = error.response.data.message ? `${packageId}:${error.response.data.message}\n` : `Deployment Failed for ${packageId}\n`;
                console.log(message);
                fs.appendFileSync(`${currentWorkignDir}/${boomi_deployment_failed_packages_file}`, message);
            }
        }

    } catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    } finally {
        fs.writeFileSync(`${currentWorkignDir}/${boomi_packages_file}`, JSON.stringify(successfulPackages));
        if (hasFailures) {
            let failures = fs.readFileSync(`${currentWorkignDir}/${boomi_deployment_failed_packages_file}`, "utf-8");
            core.setFailed(failures);
        }
    }
}

function getHeaders() {
    return {
        "Authorization": "Basic " + base64.encode(`${BOOMI_REST_USERNAME}:${BOOMI_REST_PASSWORD}`),
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
}

runAction();