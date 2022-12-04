import core from '@actions/core';
import axios from 'axios';
import base64 from 'base-64';

const JIRA_REST_API_URL = core.getInput('JIRA_REST_API_URL');
const JIRA_ISSUE_KEY = core.getInput('JIRA_ISSUE_KEY');
const JIRA_USERNAME = core.getInput('JIRA_USERNAME');
const JIRA_API_KEY = core.getInput('JIRA_API_KEY');
const JIRA_ISSUE_TRANSITION_TO_CODE = core.getInput('JIRA_ISSUE_TRANSITION_TO_CODE');
const URL = `${JIRA_REST_API_URL}/rest/api/3/issue/${JIRA_ISSUE_KEY}/transitions`;

async function runAction() {
    try {   
        await transitionIssue();
    } catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    }
}

async function transitionIssue(){     
   
    let config = {
        url: URL,
        method: 'POST',
        headers: getHeaders(),
        data: JSON.stringify({
            "transition": {
              "id": JIRA_ISSUE_TRANSITION_TO_CODE
            }
          })
    };   

    let response = await axios(config); 
    console.log(`status: ${response.status}`)   
    console.log(`Data: ${response.data}`);    
    
}

function getHeaders() {
    return {
        "Authorization": "Basic " + base64.encode(`${JIRA_USERNAME}:${JIRA_API_KEY}`),
        "Content-Type": "application/json",       
    }
}

runAction();