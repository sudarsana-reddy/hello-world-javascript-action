import core from '@actions/core';
import fetch from 'node-fetch';
import base64 from 'base-64';
import fs from 'fs';

const JIRA_REST_API_URL = core.getInput('JIRA_REST_API_URL');
const JIRA_ISSUE_KEY = core.getInput('JIRA_ISSUE_KEY');
const JIRA_USERNAME = core.getInput('JIRA_USERNAME');
const JIRA_API_KEY = core.getInput('JIRA_API_KEY');
const JIRA_TABLE_HEADERS = core.getInput('JIRA_TABLE_HEADERS');
const PEGA_DEPLOYMENT_STATUS_JSON = core.getInput('PEGA_DEPLOYMENT_STATUS_JSON') || "pega-deployment-status.json";
const URL = `${JIRA_REST_API_URL}/rest/api/3/issue/${JIRA_ISSUE_KEY}/comment`;

async function runAction() {
    try {
        let pegaPipelineStatus = await getPipelineStatusJsonData();
        let commentsJson = await generatePipeleStatusAsJiraCommentsTable(pegaPipelineStatus);
        await addCommentsToJiraIssue(commentsJson);
    } catch (error) {
        console.log(error.message);
        core.setFailed(error.message);
    }
}

async function addCommentsToJiraIssue(commentsJson){
    console.log(JSON.stringify(commentsJson, null, 2));
    
    let config = {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(commentsJson, null,2)
    };

    let response = await fetch(URL, config);
    // let data = await response.json();
    console.log(response.status);    
}

async function getPipelineStatusJsonData() {
    const PipelineInfoJsonString = fs.readFileSync(`${process.cwd()}/${PEGA_DEPLOYMENT_STATUS_JSON}`, 'utf-8');
    const pipelineInfoJson = JSON.parse(PipelineInfoJsonString);
    return pipelineInfoJson;
}

async function generatePipeleStatusAsJiraCommentsTable(json) {
    let headers = JIRA_TABLE_HEADERS.split(",");

    let dataRows = [];

    if (json.length > 0) {
        let headersFormat = [];
        headers.forEach(header => {
            let headerJson = {
                "type": "tableHeader",
                "attrs": {},
                "content": [
                    {
                        "type": "paragraph",
                        "content": [
                            {
                                "type": "text",
                                "text": header,
                            }
                        ]
                    }
                ]
            }
            headersFormat.push(headerJson);
        })

        let headerRow = {
            "type": "tableRow",
            "content": headersFormat
        };

        dataRows.push(headerRow);

        json.forEach(d => {
            let tabelCellFormat = [];
            for (let index = 0; index < headers.length; index++) {
                let columnData = {
                    "type": "tableCell",
                    "attrs": {},
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": d[headers[index]]
                                }
                            ]
                        }
                    ]
                }

                tabelCellFormat.push(columnData);
            }
            dataRows.push({
                "type": "tableRow",
                "content": tabelCellFormat
            })
        })


        let updateJson = {
            "body": {
                "version": 1,
                "type": "doc",
                "content": [
                    {
                        "type": "table",
                        "attrs": {
                            "isNumberColumnEnabled": false,
                            "layout": "default"
                        },

                        "content": dataRows
                    }
                ]
            }
        }       
        
        return updateJson;
    }

}

function getHeaders() {
    return {
        "Authorization": "Basic " + base64.encode(`${JIRA_USERNAME}:${JIRA_API_KEY}`),
        "Content-Type": "application/json"
    }
}

runAction();