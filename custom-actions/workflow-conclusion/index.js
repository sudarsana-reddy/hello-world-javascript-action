const core = require('@actions/core');
const github = require('@actions/github/lib/github');
const Context = require('@actions/github/lib/context');



async function runAction() {
    let token = core.getInput('TOKEN');
    let octokit = github.getOctokit(token);
    let context = new Context.Context();
    console.log("owner: ", context.repo.owner)
    console.log("repo: ", context.repo.repo)
    console.log("run_id: ", context.runId)
    let jobs = await octokit.rest.actions.listJobsForWorkflowRun({
        owner: context.repo.owner,
        repo: context.repo.repo,
        run_id: context.runId
    })
    
    console.log("Jobs: ", JSON.stringify(jobs, null, 2));
    jobs.forEach(job => console.log(JSON.stringify(job, null, 2)));
}

runAction();

