# Attendly

Facial-recognition attendance management for university courses and student groups.

## Stack

- Next.js 14 (App Router) + TypeScript (strict)
- PostgreSQL + Prisma
- face-api.js (TensorFlow.js) for on-device face detection and embedding — recognition
  runs entirely in the browser; only the resulting numeric embedding is sent to the server
- Framer Motion for subtle transitions
- Tailwind CSS

## Architecture

```
app/                     Routes (App Router). Route groups: (dashboard) for the
                          sidebar shell, plus standalone routes for /login and the
                          fullscreen attendance session.
app/api/                 REST route handlers. Thin — they validate input, check
                          authorization, and delegate to services/.
services/                Business logic, isolated from UI and HTTP:
  faceEnrollmentService.ts   Browser-side: validates a live frame (one face,
                              size, centering) and extracts a 128-d embedding.
  faceRecognitionService.ts  Browser-side: compares a frame's embedding against
                              a group's enrolled embeddings and classifies the
                              result (auto-confirm / needs-confirmation / unknown)
                              using configurable thresholds.
  attendanceService.ts       Server-side: duplicate-safe attendance recording,
                              manual corrections with an audit trail, dashboard
                              statistics — all backed by PostgreSQL.
lib/                      Cross-cutting: Prisma client, session/auth, authorization
                          helpers, face model loader.
components/               Reusable UI. components/camera holds the shared camera
                          frame + face guide used by both enrollment and sessions.
prisma/schema.prisma      Data model. See below.
```

The recognition pipeline (`lib/face` + `services/face*Service.ts`) is intentionally
isolated from the UI. Swapping the underlying model (e.g. for a server-side or
native recognizer later) means replacing those two files — nothing in `app/` needs
to change beyond the shape of the embedding.

## Data model

`User` → `Group` → `Student` → `FaceEnrollment` (1:1, embedding only, no images)
`Group` → `Lesson` → `Attendance` (unique per `lessonId` + `studentId`) → `AttendanceAudit`

Biometric data lives in its own table (`FaceEnrollment`) holding a `Float[]` embedding
and a quality score — never a photograph. Deleting a student's face enrollment does not
touch their attendance history.

## Local setup

```bash
npm install
cp .env.example .env
# edit .env: set DATABASE_URL to a local Postgres instance, and SESSION_SECRET
# to a random 32+ character string (openssl rand -base64 48)

npm run setup:models   # downloads face-api.js model weights into public/models
                        # (already included in this export — re-run only if you
                        # need to refresh them)

npx prisma migrate dev --name init
npm run db:seed        # creates an admin login and two empty groups

npm run dev
```

Sign in with `admin@attendly.dev` / `ChangeMe123!` (change this password in a real
deployment — the seed script refuses to run against `NODE_ENV=production` unless
`ALLOW_PROD_SEED=true` is set).

Seed data intentionally does **not** include face enrollments, lessons, or attendance
records — those only exist once you actually enroll a student's face through the
camera and run a real session. The dashboard reads zeros until then; nothing in the
UI shows fabricated numbers.

## Using it

1. Sign in, create a group.
2. Open the group → **Add Student** → enter name → consent to face enrollment →
   look at the camera. The flow validates a single, well-framed face before
   registering it.
3. **Start Attendance** opens the fullscreen session. Students look at the camera
   one at a time; high-confidence matches are recorded automatically, medium-confidence
   matches ask for confirmation, and unrecognized faces are rejected without guessing.
4. **End Session** shows a summary; the attendance page and dashboard reflect it
   immediately, from PostgreSQL.
5. Manual corrections are available from the group's Students tab and are recorded
   with who made the change and when.

## Recognition thresholds

Configurable per teacher in **Settings → Face Recognition**:

- **Recognition threshold** — similarity at or above this is marked present automatically.
- **Confirmation threshold** — similarity between this and the recognition threshold
  prompts a "Confirm identity?" step instead of guessing.

Below the confirmation threshold, a face is reported as unrecognized.

## Deploying to Railway

1. Create a new Railway project, attach a PostgreSQL plugin.
2. Add this repo as a service; Railway's Nixpacks builder auto-detects Next.js.
3. Set environment variables: `DATABASE_URL` (from the Postgres plugin),
   `SESSION_SECRET`, `NODE_ENV=production`.
4. `railway.json` runs `prisma migrate deploy` before `next start` on every deploy,
   so migrations stay in sync automatically.
5. After the first deploy, run the seed script once if you want a starting admin
   account: `railway run npm run db:seed`.

The face model weights in `public/models` are static assets and deploy with the app;
no separate download step is needed in production.

## Security notes

- Sessions are signed JWTs in an httpOnly, `secure` (in production), `sameSite=lax`
  cookie — never stored in localStorage.
- All `/api/*` routes and dashboard routes are protected by `middleware.ts`; a
  request without a valid session is rejected before it reaches a route handler.
- Every group/student/lesson lookup re-checks ownership server-side — a teacher
  cannot read or modify another teacher's data by guessing an ID.
- Face embeddings are the only biometric artifact ever persisted; they are never
  logged, never placed in a URL, and are deleted independently of attendance history
  via the student profile's "Re-register face" / "Remove" actions.
- Login is rate-limited per IP.
