/**
 * YesCapital API Service Layer
 * 
 * In Prototype/Mock Mode, all calls route through the robust mock API service.
 * When integrating with Spring Boot later, swap the exports to the REST API implementations below.
 */

export * from "./mockApi";

/*
// ============================================================================
// PRODUCTION SPRING BOOT BACKEND INTEGRATION (Future Phase)
// ============================================================================
const API_BASE_URL = "http://localhost:8088/api";

async function request(endpoint, options = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {}),
        },
        ...options,
    });
    if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const errorData = await response.json();
            if (errorData.message) errorMessage = errorData.message;
        } catch {}
        throw new Error(errorMessage);
    }
    if (response.status === 204) return null;
    return response.json();
}
*/