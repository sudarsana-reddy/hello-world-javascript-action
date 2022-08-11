const core = require('@actions/core');
const github = require('@actions/github/lib/github');
const Context = require('@actions/github/lib/context');
const nodemailer = require('nodemailer');
const fs = require('fs');

const email_template_file = "./templates/email-template.html";
let status = core.getInput('STATUS');
let token = core.getInput('TOKEN');
let smtp_host = core.getInput('SMTP_HOST');
let smtp_port = core.getInput('SMTP_PORT');
let username = core.getInput('USERNAME');
let password = core.getInput('PASSWORD');
let to_email = core.getInput("TO");

let context = new Context.Context();
let repoName = context.repo.repo;
let organization = context.repo.owner;
let workflow_name = context.workflow;


async function runAction() {
    try {
        // let workflowRunURL = await getWorkflowRunURL();
        // console.log("workflow run html url: ", workflowRunURL);
        let emailContent = await getEmailContent();
        // console.log("Email Content:", emailContent);
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

    let message = {
        from: `GitHub Notiofications ${username}`,
        to: to_email,
        subject: `${organization}/${repoName} - ${workflow_name}: ${status}`,
        html: emailContent
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

async function getEmailContent() {
    let emailContent = fs.readFileSync(email_template_file, 'utf-8');
    emailContent = emailContent.replace("{{owner_name}}", organization)
        .replace("{{repo_name}}", repoName)
        .replace("{{workflow_name}}", workflow_name)
        .replace("{{status}}", status)
        .replace("{{workflow_url}}", workflowRunURL);
    return emailContent;
}

runAction();