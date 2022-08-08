# Boomi Generate Packages for the components

This action generates packages for the given components (specified in components.json) and 
generates 
   # boomi-packages.json  - Json file with componentId(s) and their respective packageIds.
   # failed-components.txt - List of failed components  with error messages

## BOOMI_REST_URL: 
    description: 'Boomi Rest URL'
    required: true   

##  BOOMI_TFA_ACCOUNTID: 
    description: 'BOOMI_TFA_ACCOUNTID'
    required: true 

##  BOOMI_REST_PASSWORD:  
    description: 'Boomi Username'
    required: true    

##  BOOMI_REST_PASSWORD: 
    description: 'Boomi Password/apikey'
    required: true 

##  BOOMI_COMPONENTS_JSON:
    description: 'Boomi Components json'
    required: true 
    default: components.json

## Example usage

uses: <organization_name>/github-custom-actions/boomi-build-package@main
with:
  BOOMI_REST_URL: https://api.boomi.com/...
  BOOMI_TFA_ACCOUNTID:
  BOOMI_REST_PASSWORD:
  BOOMI_COMPONENTS_JSON: