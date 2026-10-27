/**
 * Switches that are off in production. "Add Reel" lets a person store a video on their own device only;
 * the first public version has no user posting (reels are added by the OvoPrice team), so the button is
 * hidden unless this is explicitly turned on, e.g. for local testing: VITE_ENABLE_ADD_REEL=true.
 */
export const ADD_REEL_ENABLED = (import.meta.env.VITE_ENABLE_ADD_REEL as string | undefined) === 'true';
