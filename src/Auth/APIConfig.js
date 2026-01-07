// Get API base URL from environment variable or use default for development
const getAPIBaseURL = () => {
  console.log('Environment check:', {
    NODE_ENV: process.env.NODE_ENV,
    REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL
  });
  
  // Use environment variable if set (for DigitalOcean App Platform)
  if (process.env.REACT_APP_API_BASE_URL) {
    console.log('Using environment variable:', process.env.REACT_APP_API_BASE_URL);
    return process.env.REACT_APP_API_BASE_URL;
  }
  
  // For local development
  if (process.env.NODE_ENV === 'development') {
    console.log('Using development default: http://localhost:8000');
    return "http://localhost:8000";
  }
  
  // For production on DigitalOcean, use IP address temporarily until DNS propagates
  console.log('Using production API: http://209.38.122.225:8000');
  return "http://209.38.122.225:8000";
};

export const config = {
  APP_NAME: "NexFarm",
  API_URL: `${getAPIBaseURL()}/api`, 
  IS_PRODUCTION: process.env.NODE_ENV === 'production'
};

console.log('Final API configuration:', {
  API_URL: `${getAPIBaseURL()}/api`,
  BASE_URL: getAPIBaseURL(),
  IS_PRODUCTION: process.env.NODE_ENV === 'production'
});

export const SERVER_API_URL = config.API_URL;
export const API_BASE_URL = getAPIBaseURL();
export const IS_PRODUCTION = config.IS_PRODUCTION;