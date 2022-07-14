const core = require('@actions/core');
const github = require('@actions/github');
const http_client = require('@actions/http-client');

try {
  
  const PEGA_DM_REST_URL   = core.getInput('PEGA_DM_REST_URL');
  const PEGA_DM_CLIENT_ID   = core.getInput('PEGA_DM_CLIENT_ID');
  const PEGA_DM_CLIENT_SECRET   = core.getInput('PEGA_DM_CLIENT_SECRET');
  const PEGA_PIEPLINE_ID   = core.getInput('PEGA_PIEPLINE_ID'); 

  console.log(`PEGA_DM_REST_URL: ${PEGA_DM_REST_URL}`);
  console.log(`PEGA_DM_CLIENT_ID: ${PEGA_DM_CLIENT_ID}`);
  console.log(`PEGA_DM_CLIENT_SECRET: ${PEGA_DM_CLIENT_SECRET}`);
  console.log(`PEGA_PIEPLINE_ID: ${PEGA_PIEPLINE_ID}`);

  // const httpClient = http_client.HttpClient;
  // httpClient.post(`$PEGA_DM_REST_URL/oauth2/v1/token`);
  
  const time = (new Date()).toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const payload = JSON.stringify(github.context.payload, undefined, 2)
  console.log(`The event payload: ${payload}`);
} catch (error) {
  core.setFailed(error.message);
}