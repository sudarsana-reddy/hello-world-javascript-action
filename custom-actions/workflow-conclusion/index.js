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
    
    octokit.rest.checks.get({

    })
    let response = await octokit.rest.actions.listJobsForWorkflowRun({
        owner: context.repo.owner,
        repo: context.repo.repo,
        run_id: context.runId
    })

    let jobs = response.data.jobs;
    console.log("Jobs: ", JSON.stringify(jobs, null, 2));
    let jobsWithConclusions= jobs.filter(job => job.conclusion !== null);
    jobsWithConclusions.forEach(job=> console.log(`Name: ${job.name} - Conclusion: ${job.conclusion} - status: ${job.status}`));    
}

runAction();