// Feature flags, resolved at build time. Voting ships dark until the organizers
// open it: build with VITE_VOTING=1 (and run the api with SUMMER_VIBE_VOTING=1).
export const VOTING = import.meta.env.VITE_VOTING === "1";
