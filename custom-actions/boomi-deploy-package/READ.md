# Boomi Generate Packages for the components

This action generates packages for the given components (specified in components.json) and 
generates 
   # deployment-successful-packages.json  - Json file with packages(s) and their respective deploymentIds.
   # fdeployment-failed-packages.txt - List of deployment failed packages  with error messages

## BOOMI_REST_URL: 
    description: 'Boomi Rest URL'
    required: true   

##  BOOMI_TFA_ACCOUNTID: 
    description: 'BOOMI_TFA_ACCOUNTID'
    required: true 

##  BOOMI_REST_USERNAME:  
    description: 'Boomi Username'
    required: true    

##  BOOMI_REST_PASSWORD: 
    description: 'Boomi Password/apikey'
    required: true 

##  BOOMI_PACKAGES_JSON:
    description: 'Boomi packages json'
    required: true 
    default: boomi-packages.json

## BOOMI_ENVIRONMENT_ID: 
    description: 'BOOMI Environment Id'
    required: true

## Example usage

uses: <organization_name>/github-custom-actions/boomi-build-package@main
with:
  BOOMI_REST_URL: https://api.boomi.com/...
  BOOMI_TFA_ACCOUNTID:
  BOOMI_REST_USERNAME
  BOOMI_REST_PASSWORD:
  BOOMI_PACKAGES_JSON:
  BOOMI_ENVIRONMENT_ID: