const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const qs = require('qs');
const { formatJson, logErrors } = require('./utils')


//pipeline-mapping.json should come from the calling workflow repo
const pipelineMapping = require('./pipeline-mapping.json');

// PEGA CONNECTION DETAILS
const PEGA_DM_REST_URL = core.getInput('PEGA_DM_REST_URL');
const PEGA_DM_CLIENT_ID = core.getInput('PEGA_DM_CLIENT_ID');
const PEGA_DM_CLIENT_SECRET = core.getInput('PEGA_DM_CLIENT_SECRET');

// PEGA DEPLOY APP DETAILS
const PEGA_TARGET_APP = core.getInput('PEGA_TARGET_APP');
const PEGA_PROD_NAME = core.getInput('PEGA_PROD_NAME');
const PEGA_PROD_VERSION = core.getInput('PEGA_PROD_VERSION');
const PEGA_DEPLOYMENT_WAIT_TIME = parseInt(core.getInput('PEGA_DEPLOYMENT_WAIT_TIME')); //default 10 MINUTES   
const IDLE_TIME_INTERVAL = parseInt(core.getInput("IDLE_TIME_INTERVAL")) // deafult 1 minute
//PEGA PIPELINE ID
const PEGA_PIEPLINE_ID = pipelineMapping["PEGA_TARGET_APP"] || "Pipeline-QEKH0";

//Log all details to console
console.log(`PEGA_DM_REST_URL: ${PEGA_DM_REST_URL}`);
console.log(`PEGA_TARGET_APP: ${PEGA_TARGET_APP}`);
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

//main function (entry point)
async function runAction() {

  try {

    await getAccessToken();
    await updatePipeline();
    let deploymentID = await triggerPipeline();
    await waitForDeploymentToComplete(deploymentID);
  } catch (error) {
    console.log(error.message)
    core.setFailed(error.message);
  }
}

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
  let response = {};
  console.log(`Getting Pipeline Data for ${PEGA_PIEPLINE_ID}`)
  let config = {
    method: 'get',
    url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${PEGA_PIEPLINE_ID}`,
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  };

  try {
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
      throw error;
    }
  }
  return response.data;
}

async function updatePipeline() {
  try {

    let pipelineData = await getPipelineData(access_token);

    //Checking if updating pipelie is required.
    console.log(`Checking if updating pipelie is required`);
    let existing_product_name = pipelineData.pipelineParameters.filter(item => item.name === "productName")[0];
    let existing_product_version = pipelineData.pipelineParameters.filter(item => item.name === "productVersion")[0];
    let isUpdateRequired = false;

    if (existing_product_name.value != PEGA_PROD_NAME) {
      isUpdateRequired = true;
      existing_product_name.value = PEGA_PROD_NAME;
    }

    if (existing_product_version.value != PEGA_PROD_VERSION) {
      isUpdateRequired = true;
      existing_product_version.value = PEGA_PROD_VERSION;
    }

    if (isUpdateRequired) {

      let response = {}
      console.log("Update is required for pipeline Data, updating", formatJson(pipelineData));

      let config = {
        method: 'put',
        url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${PEGA_PIEPLINE_ID}`,
        headers: {
          'Authorization': `Bearer ${access_token}`
        },
        data: JSON.stringify(pipelineData)
      };

      try {
        response = await axios(config);
        console.log("response is : ", formatJson(response.data));
      } catch (error) {
        if (error.response.status === 401) {
          console.log("Token has expired. Getting new token");
          let access_token = getAccessToken();
          console.log("Re-requesting the update pipeline");
          config.headers.Authorization = `Bearer ${access_token}`;
          response = await axios(config);
          console.log("response is : ", formatJson(response.data));
        } else {
          throw error;
        }
      }
      return response.data;
    } else {
      console.log("No Update required, skipping the step");
    }
  } catch (error) {
    console.log("Error while updating the pipelline:", error.message);
    logErrors(error);
    throw error;
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
  try {
    response = await axios(config);
    console.log(`trigger deployment response is :`, formatJson(response.data));
  } catch (error) {
    if (error.response.status === 401) {
      console.log("Token has expired. Getting new token");
      await getAccessToken();
      console.log("Re-requesting the pipeline data");
      config.headers.Authorization = `Bearer ${access_token}`;
      response = await axios(config);
      console.log(`response is : `, formatJson(response.data));
    } else {
      console.log("Error while triggering the pipelline:", error.message);
      logErrors(error);
      throw error;
    }
  }
  return response.data.deploymentID;
}

async function waitForDeploymentToComplete(deploymentID) {

  console.log("Waiting for the deployment to complete or error out");

  let response = {}
  let deploymentStatus = "";
  let isInProgress = true;
  let totalTime = 0; // 1 minute 
  do {
    console.log(`Sleeping for ${IDLE_TIME_INTERVAL} minutes`)
    await new Promise(resolve => setTimeout(resolve, IDLE_TIME_INTERVAL * 60 * 1000)); //sleep for the specified idle time
    totalTime += IDLE_TIME_INTERVAL;
    let config = {
      method: 'get',
      url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/deployments/${deploymentID}`,
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    };

    try {
      response = await axios(config);
      console.log(`deployment status response is : `, formatJson(response.data));
    } catch (error) {
      if (error.response.status === 401) {
        console.log("Token has expired. Getting new token");
        await getAccessToken();
        console.log("Re-requesting the deployment status");
        config.headers.Authorization = `Bearer ${access_token}`;
        response = await axios(config);
        console.log("response is : ", formatJson(response.data));
      } else {
        console.log("Error while updating the pipelline:", error.message);
        logErrors(error);
        throw error;
      }
    }

    deploymentStatus = response.data.status;
    isInProgress = (deploymentStatus === "Open-Queued" || deploymentStatus == "Open-InProgress") ? true : false;
    let manualSteps = response.data.taskList.filter(x => x.status === "Pending-Input");
    if (manualSteps.length > 0) {
      let manualStep = manualSteps[0];
      console.log(`Approval is required for manual step: "${manualStep.taskLabel}" in stage: "${manualStep.stageName}"`)
      return;
    }

  } while (totalTime <= PEGA_DEPLOYMENT_WAIT_TIME && isInProgress);

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
      throw errrorMessages;
    case 'Pending-Promotion':
      core.warning("Deployment is in Pending-Prmotion Status. Respective stakeholder need to promote to next level")
      console.log("Deployment is in Pending-Prmotion Status. Respective stakeholder need to promote to next level");
      break;
    default:
      break;
  }

}

runAction();