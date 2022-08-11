const core = require('@actions/core');
const github = require('@actions/github/lib/github');
const Context = require('@actions/github/lib/context');

async function runAction() {
    let token = core.getInput('TOKEN');
    let octokit = github.getOctokit(token);  
    let context = new Context.Context();
    console.log("ServerURL: ", context.serverUrl);
    console.log("Owner: ", context.repo.owner);
    console.log("Repo: ", context.repo.repo);
    console.log("RunId: ", context.runId);
    // let workflowRun = await octokit.rest.actions.getWorkflowRun({
    //     owner: context.repo.owner,
    //     repo: context.repo.repo,
    //     run_id: context.runId
    // });
    
    // console.log("workflow data: ", JSON.stringify(workflowRun.data, null, 2)); 
    // console.log("workflow run url: ", workflowRun.data.url); 
    // console.log("workflow run status: ",  workflowRun.status);   
}

runAction();