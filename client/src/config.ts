// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export const API_ENDPOINTS = {
    UPLOAD: `${API_BASE_URL}/api/upload`,
    PROCESS: `${API_BASE_URL}/api/process`,
    LOAD_JOB: `${API_BASE_URL}/api/load-job`,
    LOAD_SOURCE: `${API_BASE_URL}/api/load-source`,
    FILES_TEXT: `${API_BASE_URL}/api/files`,
    HEALTH: `${API_BASE_URL}/api/health`,
} as const;