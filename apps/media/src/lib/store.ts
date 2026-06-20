import { mediaConfig } from '../config/media.config.js';
import { createObjectStore } from './object-store.js';

export const objectStore = createObjectStore(mediaConfig.r2);
