/**
 * Interface representing the expected structure of the application configuration.
 * This defines the required backend API URLs and WebSocket URL for the frontend to work properly.
 */
interface AppConfig {
    backend_url_api: string;          // Base URL of the backend API
    backend_url_knowledge: string;    // Base URL of the knowledge service
    websocket_url: string;            // WebSocket server URL
}

let config: AppConfig | null = null;

/**
 * Loads the application configuration from /config.json asynchronously.
 * Must be called before the app is rendered.
 */
export const loadConfig = async () => {
    const response = await fetch("/config.json");
    if (!response.ok) {
        throw new Error(`Cannot load config file /config.json: ${response.statusText}`);
    }
    config = await response.json();
};

/**
 * Returns the loaded configuration.
 * Throws an error if config is not loaded yet.
 */
export const getConfig = (): AppConfig => {
    if (!config) {
        throw new Error("Config file /config.json not loaded yet.");
    }
    return config;
};
