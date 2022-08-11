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
    
    console.log("workflow data: ", JSON.stringify(workflowRun.data, null, 2)); 
    console.log("workflow run html url: ", workflowRun.data.html_url); 
    console.log("workflow run api url: ",  workflowRun.url);   
    console.log("workflow run check suite url: ",  workflowRun.data.check_suite_url);   
}

runAction();