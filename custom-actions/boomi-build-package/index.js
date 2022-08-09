const core = require('@actions/core');
const axios = require('axios');
const base64 = require('base-64');
const fs = require('fs');

const BOOMI_REST_URL = core.getInput('BOOMI_REST_URL');
const BOOMI_TFA_ACCOUNTID = core.getInput('BOOMI_TFA_ACCOUNTID');
const BOOMI_REST_USERNAME = core.getInput('BOOMI_REST_USERNAME');
const BOOMI_REST_PASSWORD = core.getInput('BOOMI_REST_PASSWORD');
const BOOMI_COMPONENTS_JSON = core.getInput('BOOMI_COMPONENTS_JSON');

const boomi_packages_file = "boomi-packages.json";
const boomi_package_failed_components_file = "failed-components.txt";

let currentWorkignDir = process.cwd();
console.log(`Current Working Directoty: ${currentWorkignDir}`);
async function runAction() {
    let boomiPackageIds = [];   
    let hasFailures = false;

    try {

        let config = {
            method: 'post',
            url: `${BOOMI_REST_URL}/${BOOMI_TFA_ACCOUNTID}/PackagedComponent`,
            headers: getHeaders()
        };

        const components = require(`${process.cwd()}/${BOOMI_COMPONENTS_JSON}`)

        for (let index = 0; index < components.length; index++) {
            let component = components[index];
            let componentId = component.componentId
            let boomiPackage = { "componentId": componentId, "packageId": "", "response": {} };

            try {
                config.data = component;
                let response = await axios(config);
                console.log(`Response: ${JSON.stringify(response.data)}`);                
                let packageId = response.data.packageId;
                boomiPackage.packageId = packageId;
                boomiPackage.response = response.data;
                boomiPackageIds.push(boomiPackage);
            } catch (error) {
                hasFailures = true;
                console.log(`Error: ${JSON.stringify(error.response.data)}`);         
                let message = error.response.data.message ? `${componentId}:${error.response.data.message}\n` : `Packaging Failed for ${componentId}\n`;
                console.log(message);
                fs.appendFileSync(`${currentWorkignDir}/${boomi_package_failed_components_file}`, message);                
            }

        }

    } catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    } finally {        
        fs.writeFileSync(`${currentWorkignDir}/${boomi_packages_file}`, JSON.stringify(boomiPackageIds));
        if(hasFailures){
            let failures = fs.readFileSync(`${currentWorkignDir}/${boomi_package_failed_components_file}`, "utf-8");
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