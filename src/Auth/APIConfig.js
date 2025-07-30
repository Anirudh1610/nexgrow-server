// Get API base URL from environment variable or use default for development
const getAPIBaseURL = () => {
  // In production (Vercel), use the environment variable
  if (process.env.REACT_APP_API_BASE_URL) {
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // Use DigitalOcean droplet IP for development/testing (nginx listens on port 80)
  return "http://143.110.181.10";
};

export const config = {
  APP_NAME: "NexFarm",
  API_URL: `${getAPIBaseURL()}/api`, 
  IS_PRODUCTION: process.env.NODE_ENV === 'production'
};

export const SERVER_API_URL = config.API_URL;
export const API_BASE_URL = getAPIBaseURL();
export const IS_PRODUCTION = config.IS_PRODUCTION;