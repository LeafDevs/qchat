import {
    betterAuth
} from 'better-auth';

import Database from "better-sqlite3";

export const auth = betterAuth({
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!
        }
    },
    database: new Database("auth.sqlite"),

    /** if no database is provided, the user data will be stored in memory.
     * Make sure to provide a database to persist user data **/
});