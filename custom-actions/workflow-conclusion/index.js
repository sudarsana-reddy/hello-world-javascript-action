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

    let response = await octokit.rest.actions.listJobsForWorkflowRun({
        owner: context.repo.owner,
        repo: context.repo.repo,
        run_id: context.runId
    })

    let jobs = response.data.jobs;
    console.log("Jobs: ", JSON.stringify(jobs, null, 2));
    let jobsWithConclusions = jobs.filter(job => job.conclusion !== null);

    for (let index = 0; index < jobsWithConclusions.length; index++) {
        let job = jobsWithConclusions[index];
        let jobName = job.name;
        let jobConclusion = job.conclusion;
        let jobStatus = job.status;        
        let checkRunUrlSplits = job.check_run_url.split("/");
        let chekRunId = checkRunUrlSplits[checkRunUrlSplits.length - 1];
        console.log(chekRunId);
        let jobAnnotations = await octokit.rest.checks.listAnnotations({
            owner: context.repo.owner,
            repo: context.repo.repo,
            check_run_id: chekRunId 
        });

        console.log(JSON.stringify(jobAnnotations, null, 2));

        let annotatiionMessages="";
        jobAnnotations.data.forEach(annotation => {
            annotatiionMessages += (annotation.message + "\n");
        })
        
        console.log(`Name: ${jobName} - Conclusion: ${jobConclusion} - Status: ${jobStatus}`);
        console.log(`${annotatiionMessages}`);
    };

}

runAction();