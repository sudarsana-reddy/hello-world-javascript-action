const core = require('@actions/core');
const github = require('@actions/github/lib/github');
const Context = require('@actions/github/lib/context');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

console.log("executing directory: ", __dirname);
const email_template_file = `${__dirname}/templates/email-template.html`;
const email_attachments = core.getInput("ATTACHMENTS");
let status = core.getInput('STATUS');
let token = core.getInput('TOKEN');
let smtp_host = core.getInput('SMTP_HOST');
let smtp_port = core.getInput('SMTP_PORT');
let username = core.getInput('SMTP_USERNAME');
let password = core.getInput('SMTP_PASSWORD');
let to_email = core.getInput("TO");
let cc_email = core.getInput("CC");

let context = new Context.Context();
let repoName = context.repo.repo;
let organization = context.repo.owner;
let workflow_name = context.workflow;


async function runAction() {
    try {
        let workflowRunURL = await getWorkflowRunURL();
        console.log("workflow run html url: ", workflowRunURL);
        let emailContent = await getEmailContent(workflowRunURL);
        await sendEmail(emailContent);
    } catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    }
}

async function sendEmail(emailContent) {
    let transporter = nodemailer.createTransport({
        host: smtp_host,
        port: smtp_port,
        auth: {
            user: username,
            pass: password
        }
    });

    let filePath = path.join(process.cwd(), email_attachment);
    console.log(`filePath: ${filePath}`);
    let message = {
        from: `GitHub Notifications ${username}`,
        to: to_email,
        cc: cc_email,
        subject: `${organization}/${repoName} - ${workflow_name}: ${status}`,
        html: emailContent    
    }

    
    let attachments = [];
    let filePaths = email_attachments.split(";");
    for (let filePath of filePaths){
        let pathSplits = filePath.split("/");
        let fileName = pathSplits[pathSplits.length-1];
        attachments.push({
            filename: fileName,
            path: path.join(process.cwd(), filePath)
        })
    }

    if(attachments.length > 0){
        message.attachments = attachments;
    }


    let info = await transporter.sendMail(message);
    console.log('Message sent successfully!');
    console.log("Mail Response: ", info);
    console.log(nodemailer.getTestMessageUrl(info));

    transporter.close();
}

async function getWorkflowRunURL() {
    let octokit = github.getOctokit(token);
    let workflowRun = await octokit.rest.actions.getWorkflowRun({
        owner: context.repo.owner,
        repo: context.repo.repo,
        run_id: context.runId
    });
    return workflowRun.data.html_url;
}

async function getEmailContent(workflowRunURL) {
    let emailContent = fs.readFileSync(email_template_file, 'utf-8');
    emailContent = emailContent.replace("{{ORGANIZATION}}", organization)
        .replaceAll("{{REPO_NAME}}", repoName)
        .replaceAll("{{WORKFLOW_NAME}}", workflow_name)
        .replaceAll("{{JOB_STATUS}}", status)
        .replaceAll("{{WORKFLOW_URL}}", workflowRunURL)
        .replaceAll("{{FAILED_JOBS}}", await getFailedJobs());
    console.log(emailContent);
    return emailContent;
}

async function getFailedJobs() {
    let resultRows = "";
    let jobData = await getJobData();
    for (let job of jobData) {
        let trData = `<tr>
                        <td align="center" valign="top">${job.name}</td>
                        <td align="center" valign="top">${job.annotations}</td>
                    </tr>`;

        resultRows += trData + "\n";
    }

    return resultRows;
}

async function getJobData() {
    return [
        {
            "name": "Job1",
            "annotations": "Message1"
        },
        {
            "name": "Job2",
            "annotations": "Message2"
        }
    ]
}

runAction();