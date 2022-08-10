const core = require('@actions/core');
const github  = require('@actions/github/lib/github');
const Context = require('@actions/github/lib/context');

let token = core.getInput('TOKEN');
let octokit = github.getOctokit(token);
let context = new Context.Context();

let jobs = octokit.rest.actions.listJobsForWorkflowRun({ 
    repo: context.repo,
    run_id: context.runId   
})

jobs.forEach(job=> console.log(JSON.stringify(job, null, 2)));