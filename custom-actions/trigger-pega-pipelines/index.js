import core from "@actions/core";

import fetch from 'node-fetch';
import qs from 'qs';
import fs from 'fs';

const PEGA_DM_REST_URL = core.getInput('PEGA_DM_REST_URL');
const PEGA_DM_CLIENT_ID = core.getInput('PEGA_DM_CLIENT_ID');
const PEGA_DM_CLIENT_SECRET = core.getInput('PEGA_DM_CLIENT_SECRET');
const JIRA_PEGA_APP_DATA_JSON = core.getInput('JIRA_PEGA_APP_DATA_JSON') || "jira-pega-apps.json";
const PEGA_PIPELINE_MAPPING_JSON = core.getInput('PEGA_PIPELINE_MAPPING_JSON') || "pega-pipilne-mappings.json";

const URL = `${PEGA_DM_REST_URL}/oauth2/v1/token`;

async function runAction() {
    let hasErrors = false;
    try {
        let appListJson = await getAppListInfo();
        let pipelineMappings = await getPipelinesInfo();
        for (let app of appListJson) {
            try {
                let pipelineId = pipelineMappings[app.pipelineKey];
                console.log(`pipelineId:${pipelineId}`);

                await updatePipeline(pipelineId, app);
                await triggerPipeline(pipelineId);
            } catch (e) {
                console.log(e.message);
                hasErrors = true;
            }
        };

    } catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    }

    if (hasErrors) {
        let errorMessage = "There are some errors, please take a look"
        console.log(errorMessage);
        core.setFailed(errorMessage);
    }

}

async function updatePipeline(pipelineId, app) {
    let pipelineData = await getPipelineData(pipelineId);    
    if (pipelineData.applicationName !== app.applicationName || pipelineData.applicationVersion !== app.applicationVersion) {
        let errorMessage = "The Targeted App Name and Version are not matching with Pipelinedata. Verify the pipleine mapping.";
        console.log(errorMessage);
        return;
    }
    let pipelineParameters = pipelineData.pipelineParameters;
    let productNameData = pipelineParameters.filter(param => param.name === "productName")[0];
    let producVersionData = pipelineParameters.filter(param => param.name === "productVersion")[0];

    productNameData.value = app.productName;
    producVersionData.value = app.productVersion;

    let devStage = pipelineData.stages.filter(stage => stage.environmentType === "Development")[0];
    let pegaUniTestTask = devStage.tasks.filter(task => task.taskInfo.taskType === "RunPegaUnits")[0];

    let testSuiteId = pegaUniTestTask.taskInfo.inputParameters.filter(param => param.name === "TestSuiteID")[0];
    let testSuiteAccessGroup = pegaUniTestTask.taskInfo.inputParameters.filter(param => param.name === "AccessGroup")[0];

    testSuiteId.value = app.TestSuiteID;
    testSuiteAccessGroup.value = app.AccessGroup;

    let access_token = await getAccessToken();
    let url = `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${pipelineId}`;
    console.log(`########Updating Pipeline Data for ${pipelineId}########`)

    let config = {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${access_token}`
        },
        body: JSON.stringify(pipelineData)
    };

    let response = await fetch(url, config);
    let data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

async function triggerPipeline(pipelineId) {
    let access_token = await getAccessToken();
    let url = `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${pipelineId}/deployments`;
    console.log(`########Triggering Pipeline - ${pipelineId}########`)

    let config = {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${access_token}`
        }        
    };

    let response = await fetch(url, config);
    let data = await response.json();
    console.log(JSON.stringify(data, null, 2));
}

async function getPipelineData(pipelineId) {
    let access_token = await getAccessToken();
    let url = `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${pipelineId}`;
    console.log(`########Getting Pipeline Data for ${pipelineId}########`)
    let config = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    };
    let response = await fetch(url, config);
    let data = await response.json();
    return data;
}



async function getAppListInfo() {
    const appListJsonString = fs.readFileSync(`${process.cwd()}/${JIRA_PEGA_APP_DATA_JSON}`, 'utf-8');
    const appListJson = JSON.parse(appListJsonString);
    return appListJson;
}

async function getPipelinesInfo() {
    const PipelineInfoJsonString = fs.readFileSync(`${process.cwd()}/${PEGA_PIPELINE_MAPPING_JSON}`, 'utf-8');
    const pipelineInfoJson = JSON.parse(PipelineInfoJsonString);
    return pipelineInfoJson;
}


async function getAccessToken() {
    console.log("Getting Access Token");

    let config = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: getUrlFormEncodedData()
    };

    let response = await fetch(URL, config);
    let jsonData = await response.json();
    let access_token = await jsonData.access_token
    console.log(`token is : ${access_token}`);
    return access_token;
}

function getUrlFormEncodedData() {
    return qs.stringify({
        'client_id': PEGA_DM_CLIENT_ID,
        'client_secret': PEGA_DM_CLIENT_SECRET,
        'grant_type': 'client_credentials'
    });
}


runAction();