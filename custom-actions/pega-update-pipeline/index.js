const core = require('@actions/core');
const github = require('@actions/github');
const axios = require('axios');
const qs = require('qs');

runAction();

async function runAction() {

  try {

    const PEGA_DM_REST_URL = core.getInput('PEGA_DM_REST_URL');
    const PEGA_DM_CLIENT_ID = core.getInput('PEGA_DM_CLIENT_ID');
    const PEGA_DM_CLIENT_SECRET = core.getInput('PEGA_DM_CLIENT_SECRET');
    const PEGA_PIEPLINE_ID = core.getInput('PEGA_PIEPLINE_ID');

    console.log(`PEGA_DM_REST_URL: ${PEGA_DM_REST_URL}`);
    console.log(`PEGA_DM_CLIENT_ID: ${PEGA_DM_CLIENT_ID}`);
    console.log(`PEGA_DM_CLIENT_SECRET: ${PEGA_DM_CLIENT_SECRET}`);
    console.log(`PEGA_PIEPLINE_ID: ${PEGA_PIEPLINE_ID}`);

    var data = qs.stringify({
      'client_id': PEGA_DM_CLIENT_ID,
      'client_secret': PEGA_DM_CLIENT_SECRET,
      'grant_type': 'client_credentials'
    });
    
    var config = {
      method: 'post',
      url: `${PEGA_DM_REST_URL}/PRRestService/oauth2/v1/token`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: data
    };

    let response = await axios(config);
    console.log(response.data.access_token);
    core.setOutput("token", response.data.access_token);


  } catch (error) {
    core.setFailed(error.message);
  }

}