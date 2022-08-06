const core = require('@actions/core');
const axios = require('axios');
const qs = require('qs');
const { formatJson, logErrors } = require('./utils')

// PEGA CONNECTION DETAILS
const PEGA_DM_REST_URL = core.getInput('PEGA_DM_REST_URL');
const PEGA_DM_CLIENT_ID = core.getInput('PEGA_DM_CLIENT_ID');
const PEGA_DM_CLIENT_SECRET = core.getInput('PEGA_DM_CLIENT_SECRET');

// PEGA DEPLOY APP DETAILS
const PEGA_PIEPLINE_ID = core.getInput('PEGA_PIEPLINE_ID');
const PEGA_PROD_NAME = core.getInput('PEGA_PROD_NAME');
const PEGA_PROD_VERSION = core.getInput('PEGA_PROD_VERSION');
const PEGA_DEPLOYMENT_WAIT_TIME = parseInt(core.getInput('PEGA_DEPLOYMENT_WAIT_TIME')); //default 10 MINUTES   
const WAIT_TIME_INTERVAL = parseInt(core.getInput("WAIT_TIME_INTERVAL"));// deafult 1 minute

//Log all details to console
console.log(`PEGA_DM_REST_URL: ${PEGA_DM_REST_URL}`);
console.log(`PEGA_PROD_NAME: ${PEGA_PROD_NAME}`);
console.log(`PEGA_PROD_VERSION: ${PEGA_PROD_VERSION}`);
console.log(`PEGA_PIEPLINE_ID: ${PEGA_PIEPLINE_ID}`);

const TASK_STATUSES = [
    "Open-Ready",
    "Open-InProgress",
    "Resolved-Completed",
    "Resolved-Rejected",
    "Pending-Input"
];

const DEPLOYMENT_STATUSES = [
    "Resolved-Completed",
    "Open-Queued",
    "Open-Error",
    "Open-Rollback",
    "Open-Paused",
    "Open-InProgress",
    "Pending-Promotion",
    "Resolved-Aborted"
];

//Global Variables
let access_token = "";

async function getAccessToken() {
    console.log("Getting Access Token");
    let data = qs.stringify({
        'client_id': PEGA_DM_CLIENT_ID,
        'client_secret': PEGA_DM_CLIENT_SECRET,
        'grant_type': 'client_credentials'
    });

    let config = {
        method: 'post',
        url: `${PEGA_DM_REST_URL}/oauth2/v1/token`,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: data
    };

    let response = await axios(config);
    access_token = response.data.access_token
    console.log(`token is : ${access_token}`);
    return access_token;
}

async function getPipelineData() {
    console.log(`Getting Pipeline Data for ${PEGA_PIEPLINE_ID}`)
    let config = {
        method: 'get',
        url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${PEGA_PIEPLINE_ID}`,
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    };
    let response = await getResponse("GET_PIPELINE_DATA", config);
    return response.data;
}

async function updatePipeline() {
    let pipelineData = await getPipelineData();

    if (await isPipelineUpdateRequired(pipelineData)) {
        console.log("Update is required for pipeline Data, updating", formatJson(pipelineData));

        let config = {
            method: 'put',
            url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${PEGA_PIEPLINE_ID}`,
            headers: {
                'Authorization': `Bearer ${access_token}`
            },
            data: JSON.stringify(pipelineData)
        };

        return await getResponse("UPDATE_PIPELINE_DATA", config);
    } else {
        console.log("No Update required, skipping the step");
    }
}

async function triggerPipeline() {
    let response = {};
    console.log(`Triggering Deployment for ${PEGA_PIEPLINE_ID}`);
    let config = {
        method: 'post',
        url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${PEGA_PIEPLINE_ID}/deployments`,
        headers: {
            'Authorization': `Bearer ${access_token}`
        }
    };
    response = await getResponse("TRIGGER_PIPELINE", config);
    return response.data.deploymentID;
}

async function waitForDeploymentToComplete(deploymentID) {
    console.log("Waiting for the deployment to complete or error out");
    let response = {}
    let deploymentStatus = "";
    let isInProgress = true;
    let totalTime = 0; // 1 minute 
    do {
        console.log(`Sleeping for ${WAIT_TIME_INTERVAL} minutes`)
        await new Promise(resolve => setTimeout(resolve, WAIT_TIME_INTERVAL * 60 * 1000)); //sleep for the specified idle time
        totalTime += WAIT_TIME_INTERVAL;
        let config = {
            method: 'get',
            url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${PEGA_PIEPLINE_ID}/deployments/${deploymentID}`,
            headers: {
                'Authorization': `Bearer ${access_token}`
            }
        };

        response = await getResponse("GET_DEPLOYMENT_STATUS", config);
        deploymentStatus = response.data.status;
        console.log(`DeploymentStatus: ${deploymentStatus}`)
        isInProgress = (deploymentStatus === "Open-Queued" || deploymentStatus == "Open-InProgress") ? true : false;
        let manualSteps = response.data.taskList.filter(x => x.status === "Pending-Input");
        if (manualSteps && manualSteps.length > 0) {
            let manualStep = manualSteps[0];
            console.log(`Approval is required for manual step: "${manualStep.taskLabel}" in stage: "${manualStep.stageName}"`)
            core.warning(`Approval is required for manual step: "${manualStep.taskLabel}" in stage: "${manualStep.stageName}"`);
            return;
        }

    } while (totalTime <= PEGA_DEPLOYMENT_WAIT_TIME && isInProgress);

    handleDeploymentStatus(deploymentStatus, response);
}

async function handleDeploymentStatus(deploymentStatus, response) {
    switch (deploymentStatus) {
        case 'Resolved-Completed':
            console.log("Deployment Successful");
            break;
        case 'Open-Queued':
            core.warning("Deployment not started yet, check the previous deployment status");
            console.log("Deployment not started yet, check the previous deployment status");
            break;
        case 'Open-InProgress':
            core.warning("Deployment is still in progress, even after 10 minutes");
            console.log("Deployment is still in progress, even after 10 minutes");
            break;
        case 'Open-Error' || 'Resolved-Rejected':            
            console.log("There is an error/rejection in the deployment, check the error and take corrective action.");
            let errrorMessages = await logErrors(response);
            core.setFailed(errrorMessages.message);
            break;
        case 'Pending-Promotion':
            core.warning("Deployment is in Pending-Prmotion Status. Respective stakeholder need to promote to next level")
            console.log("Deployment is in Pending-Prmotion Status. Respective stakeholder need to promote to next level");
            break;
        default:
            break;
    }

}

async function isPipelineUpdateRequired(pipelineData){   
    //Checking if updating pipelie is required.
    console.log(`Checking if updating pipelie is required`);
    let isUpdateRequired = false;

    let existing_product_name = pipelineData.pipelineParameters.filter(item => item.name === "productName")[0];
    let existing_product_version = pipelineData.pipelineParameters.filter(item => item.name === "productVersion")[0];
    

    if (existing_product_name.value !== PEGA_PROD_NAME) {
        isUpdateRequired = true;
        console.log(`Update Required for Product Name. Existing product Name: "${existing_product_name}: and Required Product Name: "${PEGA_PROD_NAME}"`)
        existing_product_name.value = PEGA_PROD_NAME;
    }

    if (existing_product_version.value !== PEGA_PROD_VERSION) {
        isUpdateRequired = true;
        console.log(`Update Required for Product Version. Existing product Name: "${existing_product_version}: and Required Product Name: "${PEGA_PROD_VERSION}"`)
        existing_product_version.value = PEGA_PROD_VERSION;
    }

    return isUpdateRequired;
}

async function getResponse(opreationName, config) {
    let response = {};
    try {       
        console.log(`getResponse: Triggering request for ${opreationName}`) ;
        response = await axios(config);
        console.log("response is : ", formatJson(response.data));
    } catch (error) {
        if (error.response.status === 401) {
            console.log("Token has expired. Getting new token");
            await getAccessToken();
            console.log(`Re-requesting the pipeline data for ${PEGA_PIEPLINE_ID}`);
            config.headers.Authorization = `Bearer ${access_token}`;
            response = await axios(config);
            console.log("response is : ", formatJson(response.data));
        } else {
            console.log(`${opreationName}: Error while getting the response:`, error.message);
            console.log("Request: ", formatJson(config));
            let errorMessage = await logErrors(error.response);
            throw errorMessage;
        }
    }
    return response;
}

module.exports = { getAccessToken, updatePipeline, triggerPipeline, waitForDeploymentToComplete};