const core = require('@actions/core');
const axios = require('axios');
const base64 = require('base-64');
const fs = require('fs');
const fetch = require('node-fetch');

const BOOMI_REST_URL = core.getInput('BOOMI_REST_URL');
const BOOMI_TFA_ACCOUNTID = core.getInput('BOOMI_TFA_ACCOUNTID');
const BOOMI_REST_USERNAME = core.getInput('BOOMI_REST_USERNAME');
const BOOMI_REST_PASSWORD = core.getInput('BOOMI_REST_PASSWORD');
const BOOMI_COMPONENTS_JSON = core.getInput('BOOMI_COMPONENTS_JSON');

const components = require(`./${BOOMI_COMPONENTS_JSON}`)

const boomi_packages_file = "boomi-packages.json";
const boomi_package_failed_components_file = "failed-components.txt";

async function runAction() {
    let boomiPackageIds = [];   

    try {

        let config = {
            method: 'post',
            url: `${BOOMI_REST_URL}/${BOOMI_TFA_ACCOUNTID}/PackagedComponent`,
            headers: getHeaders()
        };

        for (let index = 0; index < components.length; index++) {
            let component = components[index];
            let componentId = component.componentId
            let boomiPackage = { "componentId": componentId, "packageId": "" };

            try {
                config.data = component;
                let response = await axios(config);
                let packageId = response.data.packageId;
                boomiPackage.packageId = packageId;
                boomiPackageIds.push(boomiPackage);
            } catch (error) {
                console.log(`Error: ${error.response.data}`);               
                let message = error.response.data.message ? `${componentId}:${error.response.data.message}\n` : `Packaging Failed for ${componentId}\n`;
                console.log(message);
                fs.appendFileSync(boomi_package_failed_components_file, message);
            }

        }

    } catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    } finally {
        fs.writeFileSync(boomi_packages_file, JSON.stringify(boomiPackageIds));
    }
}

function getHeaders() {
    return {
        "Authorization": "Basic " + base64.encode(`${BOOMI_REST_USERNAME}:${BOOMI_REST_PASSWORD}`),
        "Content-Type": "application/json"
    }
}

function isJson(response) {
    try {
        JSON.stringify(response);
        return true;
    } catch {
        return false;
    }
}

runAction();