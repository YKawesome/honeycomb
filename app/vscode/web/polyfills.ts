/**
 * Browser polyfills for Node.js modules
 * This file should be imported before any other code that might use these modules
 */

// Make process globally available for path-browserify and other modules
import process from 'process/browser';
(window as any).process = process;
(window as any).global = window;
