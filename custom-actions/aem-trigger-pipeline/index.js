const core = require('@actions/core');

const { context, getToken } = require('@adobe/aio-lib-ims');
const sdk = require('@adobe/aio-lib-cloudmanager');

const PROGRAMID = core.getInput("PROGRAMID");
const PIPELINEID = core.getInput("PIPELINEID");
const AEM_JSON_FILE_PATH = core.getInput("AEM_JSON_FILE_PATH");
const PRIVATE_KEY = core.getInput("PRIVATE_KEY");
const SHOULD_TRIGGER_PIPELINE = core.getBooleanInput("SHOULD_TRIGGER_PIPELINE");
console.log(`SHOULD_TRIGGER_PIPELINE: ${SHOULD_TRIGGER_PIPELINE}`);
const AEM_DEPLOYMENT_WAIT_TIME = parseInt(core.getInput('AEM_DEPLOYMENT_WAIT_TIME')); //default 10 MINUTES   
const IDLE_TIME_INTERVAL = parseInt(core.getInput("IDLE_TIME_INTERVAL"));// deafult 2 minutes

const CONTEXT = 'aio-cloudmanager-github-actions';

let imsConfig = require(AEM_JSON_FILE_PATH);
imsConfig.private_key = PRIVATE_KEY.toString();
let client = undefined;

async function runAction() {
    try {
        let accessToken = await getAccessToken();
        client = await sdk.init(imsConfig.ims_org_id, imsConfig.client_id, accessToken);
        let executionId = SHOULD_TRIGGER_PIPELINE ? await triggerPipeline() : await getCurrentExecution();
        console.log(`executionId: ${executionId}`);
        await waitForPipelineToComplete(executionId);
    } catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    }
}

async function getAccessToken() {
    console.log("getting access token");
    await context.set(CONTEXT, imsConfig, true);
    let access_token = await getToken(CONTEXT);
    console.log(`Access Token: ${access_token}`);
    return access_token;
}

async function triggerPipeline() {
    console.log("triggerPipeline called");
    const response = await client.createExecution(PROGRAMID, PIPELINEID, "");
    console.log(response);
    return response.id;
}

async function getCurrentExecution() {
    console.log("Getting current execution");
    const response = await client.getCurrentExecution(PROGRAMID, PIPELINEID);
    console.log(response);
    return response.id;
}

async function waitForPipelineToComplete(executionId) {

    console.log("######## Waiting for the deployment to complete or error out ########");
    let pipelineStatus = "";
    let totalTime = 0;
    do {
        console.log(`######## Total Wait Time Elpased: ${totalTime}, Maximum Wait Time: ${AEM_DEPLOYMENT_WAIT_TIME} ########`);
        console.log(`######## Idle for ${IDLE_TIME_INTERVAL} minutes, before getting the status ########`);
        await new Promise(resolve => setTimeout(resolve, IDLE_TIME_INTERVAL * 60 * 1000)); //sleep for the specified idle time
        totalTime += IDLE_TIME_INTERVAL;
        let executionResponse = await client.getExecution(PROGRAMID, PIPELINEID, executionId);
        console.log(`Response: ${JSON.stringify(executionResponse, null, 2)}`);
        pipelineStatus = executionResponse.status;
        console.log(`pipelineStatus: ${pipelineStatus}`);

        if (pipelineStatus === 'NOT_STARTED') {
            core.warning("Pipeline not started, check on manually");
            break;
        }

        if (pipelineStatus !== 'RUNNING') {
            console.log("Since the pipeline is not running, ending the wait");
            break;
        }


    } while (totalTime <= AEM_DEPLOYMENT_WAIT_TIME && (pipelineStatus === "RUNNING"));

    await handlePipelineStatus(pipelineStatus);
}

async function handlePipelineStatus(pipelineStatus) {
    switch (pipelineStatus) {
        case 'FINISHED':
            logInfo("######## Deployment Successful ########");
            break;

        case 'RUNNING':
            logWarning("######## Deployment not completed, check manually ########");
            break;

        case 'ERROR' || 'FAILED':
            logWarning("######## Deployment has Failed or Errored out. ########");
            core.setFailed("Deployment has failed");
            break;

        case 'CANCELLING' || 'CANCELLED':
            logWarning("######## Deployment not completed, check manually ########");
            core.setFailed("######## Deployment Cancelled ########");
            break;

        case 'NOT_STARTED':
            core.setFailed("######## Deployment not started, check manually ########");
            break;

        default:
            break;
    }
}

function logWarning(message) {
    core.warning(message);
    console.log(message);
}

function logInfo(message) {
    core.info(message);
    console.log(message);
}


runAction();
