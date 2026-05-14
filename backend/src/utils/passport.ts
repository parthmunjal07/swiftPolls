import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js"; 
import { users } from "../db/schema.js"; 

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL: "/api/auth/google/callback",
      proxy: true
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        if (!email) {
          return done(new Error("No email found from Google"), undefined);
        }

        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        const existingUser = existingUsers[0];

        if (existingUser) {
          if (!existingUser.google_id) {
            await db
              .update(users)
              .set({ google_id: profile.id })
              .where(eq(users.id, existingUser.id));
          }
          return done(null, existingUser);
        }

        const returnedUsers = await db
          .insert(users)
          .values({
            name: profile.displayName,
            email: email,
            google_id: profile.id,
            created_at: new Date(),
            updated_at: new Date(),
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
          });

        const newUser = returnedUsers[0];
        return done(null, newUser);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

export default passport;