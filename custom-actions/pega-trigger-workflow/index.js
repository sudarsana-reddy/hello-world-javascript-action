const core = require('@actions/core');
const {getAccessToken, triggerPipeline, updatePipeline, waitForDeploymentToComplete} = require('./lib')

//main function (entry point)
async function runAction() {
  try {
    console.log(`Current Working Directory: ${process.cwd()}`);
    await getAccessToken();
    await updatePipeline();
    let deploymentID = await triggerPipeline();
    await waitForDeploymentToComplete(deploymentID);
  } catch (error) {
    console.log(error.message)
    core.setFailed(error.message);
  }
}

runAction();