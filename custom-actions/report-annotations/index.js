const core = require('@actions/core');
const fs = require('fs');

const FILE_NAME = core.getInput("FILE_NAME");
console.log(FILE_NAME);
let message = "Sample annotation";

async function runAction() {
    try {
        
        core.warning(message);
        fs.appendFileSync(FILE_NAME, message, );
        console.log(`data: ${fs.readFileSync(FILE_NAME, 'utf-8')}`);
        
    }catch(error){
        core.setFailed(error.message);
        fs.appendFileSync(FILE_NAME, error.message);
        console.log(`data: ${fs.readFileSync(FILE_NAME, 'utf-8')}`);
    }
}

runAction();


