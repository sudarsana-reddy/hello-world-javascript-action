import core from '@actions/core';
import fetch from 'node-fetch';
import base64 from 'base-64';
import fs from 'fs';

const JIRA_REST_API_URL = core.getInput('JIRA_REST_API_URL') ;
const JIRA_ISSUE_KEY = core.getInput('JIRA_ISSUE_KEY') ;
const JIRA_USERNAME = core.getInput('JIRA_USERNAME') ;
const JIRA_API_KEY = core.getInput('JIRA_API_KEY');
const JIRA_APP_JSON_FILE = core.getInput('JIRA_APP_JSON_FILE') || "jira-pega-apps.json";
const URL = `${JIRA_REST_API_URL}/rest/api/3/issue/${JIRA_ISSUE_KEY}?fields=description,summary`;

async function runAction(){

    let config = {       
        method: 'GET',       
        headers: getHeaders()       
    };
 
    let response = await fetch(URL, config);
    let data = await response.json();   
    let appList = await getAppsInfo(data);
    await generateAppListJson(appList);
}

async function getAppsInfo(json){
    let apps = json.fields.description.content.filter(x=> x.type === "table"); 
    let headersData =  apps[0].content.filter( x=> x.content.filter(y=> y.type === "tableHeader").length > 0 );
    let headers = []; 
    headersData.forEach(x=> 
            x.content.forEach(y=>
            y.content.forEach(z=> 
            z.content.forEach(p=> 
            headers.push(p.text)))));
    console.log(headers);
    let appData =  apps[0].content.filter( x=> x.content.filter(y=> y.type === "tableCell").length > 0 );   
    let appList = [] 
    for(let i=0; i < appData.length; i++){
        let x = appData[i];
        let appInfo = {};
        for(let j=0; j < x.content.length; j++){
            let y = x.content[j];           
            for(let k=0; k < y.content.length; k++){
                let z = y.content[k];               
                for(let l=0; l < z.content.length; l++){                  
                    let data = z.content[l].text                  
                    appInfo[headers[j]] = data;                  
                }
            }            
        } 
        appList.push(appInfo);      
    }   
    
    console.table(appList);

    return appList;
}

async function generateAppListJson(json){
    fs.writeFileSync(JIRA_APP_JSON_FILE, JSON.stringify(json, null, 2), 'utf-8');
}

function getHeaders() {
    return {
        "Authorization": "Basic " + base64.encode(`${JIRA_USERNAME}:${JIRA_API_KEY}`)       
    }
}

runAction();