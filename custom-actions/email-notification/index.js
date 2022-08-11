const core = require('@actions/core');
const github = require('@actions/github/lib/github');
const Context = require('@actions/github/lib/context');

async function runAction() {
    let token = core.getInput('TOKEN');
    let octokit = github.getOctokit(token);  
    let context = new Context.Context();
    let workflowRun = await octokit.rest.actions.getWorkflowRun({
        owner: context.repo.owner,
        repo: context.repo.repo,
        run_id: context.runId
    });
    workflowRun.status
    console.log("workflow run url: ", workflowRun.url); 
    console.log("workflow run status: ",  workflowRun.status);   
}

runAction();