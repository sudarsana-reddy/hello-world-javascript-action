function formatJson(json) {
    return JSON.stringify(json, null, 2);
  }

  
  
  async function logErrors(response) {
    let errors = response.data.errors;
    let errorSummary = "";
    if (errors.length > 0) {
      await errors.forEach(x => errorSummary += (x.errorText + " and "));
      return { "message": errorSummary, "full_error": errors };
    }else{
      errorTasks = response.data.taskList.filter(x=> x.status !== "Resolved-Completed");
      if(errorTasks.length > 0){
        await errorTasks[0].errors.forEach(x => errorSummary += (x.errorMessage + " and "));
        return { "message": errorSummary};
      }
    }
  }

  module.exports = {formatJson, logErrors}
