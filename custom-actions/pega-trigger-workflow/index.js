const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const qs = require('qs');

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
const PEGA_DEPLOYMENT_WAIT_TIME = core.getInput('PEGA_DEPLOYMENT_WAIT_TIME') || 10 * 60; //default 10 MINUTES   
const IDLE_TIME_INTERVAL = core.getInput("IDLE_TIME_INTERVAL") || 1 * 60; // deafult 1 minute
//PEGA PIPELINE ID
const PEGA_PIEPLINE_ID = pipelineMapping["PEGA_TARGET_APP"];

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
let access_token = ""

//main function (entry point)
async function runAction() {

  try {

    await getAccessToken();
    await updatePipeline();
    let deploymentID = await triggerPipeline();
    await waitForDeploymentToComplete(deploymentID);

  } catch (error) {
    core.setFailed(error.message);
  }
}

async function getAccessToken() {
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

async function getPielineData() {
  let config = {
    method: 'get',
    url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${PEGA_PIEPLINE_ID}`,
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  };

  let response = await axios(config);
  console.log(`response is : ${response.data}`);

  if (response.data.errors) {
    console.log("Token has expired. Getting new token");
    await getAccessToken();
    console.log("Re-requesting the pipeline data");
    config.headers.Authorization = `Bearer ${access_token}`;
    response = await axios(config);
    console.log(`response is : ${response.data}`);
  }
  return response.data;
}

async function updatePipeline() {

  let pipelineData = await getPielineData(access_token);

  let existing_product_name = pipelineData.pipelineParameters.filter(item => item.name == "productName")[0];
  let existing_product_version = pipelineData.pipelineParameters.filter(item => item.name == "productVersion")[0].value;
  let isUpdateRequired = false;

  if (existing_product_name.value != PEGA_PROD_NAME) {
    isUpdateRequired = true;
    existing_product_name.value = PEGA_PROD_NAME;
  }

  if (existing_product_version.value != PEGA_PROD_VERSION) {
    isUpdateRequired = true;
    existing_product_name.value = PEGA_PROD_VERSION;
  }

  if (isUpdateRequired) {

    console.log("Update is required for pipeline Data, updating");
    console.log(pipelineData);

    let config = {
      method: 'put',
      url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${PEGA_PIEPLINE_ID}`,
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      data: pipelineData
    };

    let response = await axios(config);
    console.log(`response is : ${response.data}`);

    if (response.data.errors) {
      console.log("Token has expired. Getting new token");
      let access_token = getAccessToken();
      console.log("Re-requesting the pipeline data");
      config.headers.Authorization = `Bearer ${access_token}`;
      response = await axios(config);
      console.log(`response is : ${response.data}`);
    }
    return response.data;
  } else {
    console.log("No Update required, skipping the step");
  }
}

async function triggerPipeline() {
  let config = {
    method: 'post',
    url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/pipelines/${PEGA_PIEPLINE_ID}/deployments`,
    headers: {
      'Authorization': `Bearer ${access_token}`
    }
  };

  let response = await axios(config);
  console.log(`response is : ${response.data}`);

  if (response.data.errors) {
    console.log("Token has expired. Getting new token");
    await getAccessToken();
    console.log("Re-requesting the pipeline data");
    config.headers.Authorization = `Bearer ${access_token}`;
    response = await axios(config);
    console.log(`response is : ${response.data}`);
  }
  return response.data.deploymentID;
}

async function logErrors(response){
  let errorTasks = response.taskList.filter(x=> x.status !== "Resolved-Completed");
  let errorMessages = []
  let taskErrorMessages = [];
  await errorTasks.forEach(x=> {
    errorMessages = x.errors;
    taskErrorMessages.push({'taskName': x.taskType, 'errors': errorMessages});
  });
  console.log(taskErrorMessages);
  return taskErrorMessages;
}

async function waitForDeploymentToComplete(deploymentID) {

  let response={}
  let deploymentStatus = "";
  let isInProgress = true;
  let totalTime = 0; // 1 minute

  do {
    await new Promise(resolve => setTimeout(resolve, IDLE_TIME_INTERVAL * 1000)); //sleep for the specified idle time
    totalTime += IDLE_TIME_INTERVAL;
    let config = {
      method: 'get',
      url: `${PEGA_DM_REST_URL}/DeploymentManager/v1/v1/deployments/${deploymentID}`,
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    };

    response = await axios(config);
    console.log(`response is : ${response.data}`);

    if (response.data.errors) {
      console.log("Token has expired. Getting new token");
      await getAccessToken();
      console.log("Re-requesting the pipeline data");
      config.headers.Authorization = `Bearer ${access_token}`;
      response = await axios(config);
      console.log(`response is : ${response.data}`);
    }

    deploymentStatus = response.data.status;
    isInProgress = (deploymentStatus === "Open-Queued" || deploymentStatus == "Open-InProgress") ? true : false;
  } while (totalTime < PEGA_DEPLOYMENT_WAIT_TIME && isInProgress);

  switch (deploymentStatus) {
    case 'Resolved-Completed':
      console.log("Deployment Successful");
      break;
    case 'Open-Queued':
      console.log("Deployment not started yet, check the previous builds");
      break;
    case 'Open-InProgress':
      console.log("Deployment is still in progress, even after 10 minutes. Check if manual approval is required.");
      break;
    case 'Open-Error' || 'Resolved-Rejected':
      console.log("There is an error/rejection in the deployment, check the error and corrective action.");
      await logErrors(response);
      break;
    case 'Pending-Promotion':
      console.log("Deployment is in Pending Prmotion Status.");
      break;
    default:
      break;
  }

}

runAction();