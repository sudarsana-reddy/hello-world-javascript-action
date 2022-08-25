const core = require('@actions/core');
const fs = require('fs');

const FILE_NAME = core.getInput("FILE_NAME");
console.log(FILE_NAME);
let message = "Sample annotation";

async function runAction() {
    try {
        core.warning(message);
        fs.writeFileSync(FILE_NAME, message);
    }catch(error){
        core.setFailed(error.message);
        fs.writeFileSync(FILE_NAME, error.message);
    }
}


