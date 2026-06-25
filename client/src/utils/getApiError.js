export function getApiErrorMessage(error, fallback = 'Something went wrong') {
  if (!error) return fallback;

  if (error.data?.message) return error.data.message;

  if (error.status === 'FETCH_ERROR') {
    return 'Cannot connect to API. Start the backend: npm run dev (port 3000)';
  }

  if (error.status === 404) {
    return 'API not found. Restart the backend server to load latest routes.';
  }

  if (typeof error.error === 'string') return error.error;

  return fallback;
}

export default getApiErrorMessage;
