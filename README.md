📱 SafePay Mobile App (Expo + React Native)

SafePay Mobile is a milestone-based payment protection application for Clients and Freelancers.

It allows:

Secure milestone funding

Work submission with metadata

Acceptance and release flow

Dispute creation

Real-time status tracking

This app communicates with the SafePay NestJS backend.

🚀 Tech Stack

Expo (React Native)

TypeScript

TanStack Query (React Query)

Axios

NativeWind (Tailwind RN)

React Navigation

Expo Secure Store

Expo WebBrowser

Expo Document Picker

📂 Project Structure
mobile/
  src/
    components/
    screens/
      Auth/
      Projects/
      Milestones/
      Disputes/
      Admin/
    hooks/
    services/
    lib/
    navigation/
    types/
  app.json
  package.json
🧠 App Architecture

The frontend follows a server-truth-first model.

✔ No optimistic milestone state overrides
✔ No manual status merging
✔ React Query invalidation after every mutation
✔ Backend is the single source of truth

🔄 Milestone State Machine (UI Logic)
PENDING_FUNDING
→ FUNDED
→ SUBMITTED
→ ACCEPTED
→ RELEASED

SUBMITTED | ACCEPTED
→ DISPUTED

Buttons are rendered using guard helpers:

canFundMilestone

canSubmitMilestone

canAcceptMilestone

canDisputeMilestone

🔐 Authentication Flow

User logs in

Backend returns:

{
  accessToken,
  refreshToken
}

Tokens stored in SecureStore

Axios interceptor:

attaches access token

refreshes token on 401 automatically

🌍 Environment Setup
1️⃣ Install dependencies
npm install
2️⃣ Create .env

Create:

mobile/.env

Example:

EXPO_PUBLIC_API_URL=http://192.168.1.10:3333/api/v1

⚠️ IMPORTANT:

Do NOT use localhost if testing on Android device.

Use your computer’s local IP address.

Find your IP:

ipconfig
3️⃣ Start Expo
npx expo start -c

Scan QR using Expo Go.

📡 API Integration

All requests go through:

src/lib/api.ts

Axios instance:

Attaches access token

Refreshes token if expired

Returns normalized error messages

🔁 React Query Strategy
Query Keys

Project detail:

['project', projectId]

Projects list:

['projects']

Disputes:

['disputes']
Mutation Pattern

After every mutation:

await queryClient.invalidateQueries({ queryKey: ['project', projectId] });
await queryClient.invalidateQueries({ queryKey: ['projects'] });

Dispute mutation also invalidates:

await queryClient.invalidateQueries({ queryKey: ['disputes'] });

We do NOT manually merge milestone states.

📱 Main Screens
🔐 Auth

Login

Register

Auto token refresh

📊 Dashboard

Overview cards

Active projects

Recent milestones

📁 Projects

Project list

Search + filter

Create project modal

📄 Project Details

Shows:

Milestone list

Status chips

Timeline

Conditional action buttons

Actions:

Fund

Submit Work

Accept

Raise Dispute

📤 Submit Deliverables

Notes input

File metadata picker

Submit to backend

Files are sent as string[] references (metadata only for MVP).

⚖ Dispute Create

Reason input

Submit dispute

Invalidate queries on success

🧪 Manual Testing Checklist
Fund Flow

Login as CLIENT

Create project

Fund milestone

Status → FUNDED

Submit Flow

Login as FREELANCER

Submit deliverables

Status → SUBMITTED

Accept Flow

Login as CLIENT

Accept milestone

Status → ACCEPTED

Worker updates → RELEASED

Dispute Flow

Raise dispute from SUBMITTED or ACCEPTED

Status → DISPUTED

Dispute appears in Disputes screen

📂 Important Files
src/lib/api.ts

Axios setup + refresh logic

src/hooks/useMutations.ts

All mutation logic (server-truth-first)

src/hooks/useProject.ts

Project detail query

src/services/projects.service.ts

Mapping API responses

⚠️ Common Issues
Android cannot connect to backend

Replace localhost with local IP

Ensure firewall allows port 3333

Backend running

First request fails

Check refresh token logic

Clear SecureStore

Stripe not opening

Check Checkout URL

Ensure WebBrowser works

🏗 Production Build

Use EAS:

eas build --platform android

Before production:

Replace API URL with HTTPS domain

Enable production Stripe keys

Disable DEV logs

Enable error tracking (Sentry recommended)

🔒 Security Notes

Never trust frontend status

Backend enforces state transitions

All role checks validated server-side

JWT required for all protected endpoints

📈 Future Improvements

File upload to S3 instead of metadata only

Push notifications

Background polling for release

In-app Stripe PaymentSheet

Offline queue support

Dark mode

🧑‍💻 Development Philosophy

SafePay Mobile follows:

Clean state management

Server-driven UI

Strict role-based guards

Minimal optimistic updates

Predictable cache invalidation

📜 License

MIT License
