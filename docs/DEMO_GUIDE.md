# Demo guide

## Before you start

- Start MongoDB (for example `docker start bridgetalk-mongo`), then the backend (`uvicorn app.main:app --port 8000`) and the frontend (`npm run dev`), and open http://localhost:3000.
- Click **Reset sample** in the header. This clears the demo meeting's saved insights and questions in MongoDB so you start clean.
- Check that the header shows **Saved to MongoDB** and the sidebar shows **API connected · MongoDB connected**.

## 90-second presentation script

> **(0–15 s) Problem.** "In multilingual teams, half the meeting happens in a language someone doesn't speak well. Decisions get lost, and meeting notes often record things nobody actually agreed to."
>
> **(15–35 s) Transcript.** "This is a simulated launch sync. Priya speaks English, Rahul Bengali, and Ananya switches between Bengali and Hindi. Every line keeps its original language, and I can read it in English…" *(switch to Bengali)* "…or Bengali, side by side or translated only."
>
> **(35–60 s) Intelligence.** *(click Generate intelligence)* "BridgeTalk pulls out the two decisions: Android first, and an invite-only beta of five hundred users. It also finds three action items. Rahul owns the payment bugs, due Friday. Ananya owns the onboarding email, but no deadline was said, so none is shown. The Play Store screenshots have no owner, so the item says Unassigned rather than guessing. Every item links back to the exact line."
>
> **(60–80 s) Ask.** *(ask "When is the launch date?")* "It refuses to make up a launch date, because nobody said one." *(ask "Who is fixing the payment bugs?")* "And here's a grounded answer, with the source timestamp."
>
> **(80–90 s) Close.** *(reload the page)* "Everything is saved in MongoDB: the insights, my ticked item and the Q&A are still here. It works offline with a deterministic engine, and uses Gemini when a key is configured. Its output is validated so it can't invent people or decisions."

## Step-by-step live demo

| # | Action | Expected result |
|---|---|---|
| 1 | Look at the overview cards | Duration 1m 22s, 3 languages (EN, BN, HI), 3 speakers, action items "—" |
| 2 | Language selector: **Bengali · বাংলা** | Translations below each line switch to Bengali; Bengali-original lines show no duplicate |
| 3 | Transcript view: **Translated** | Every line is in Bengali, with "Translated from English/Hindi" under each translated line |
| 4 | View: **Original**, then **Both**; set the language back to English | Original language only; then original plus English translation |
| 5 | Click **Generate intelligence** | Skeletons for about 0.7 s, then the summary, 2 decisions, 3 action items, 1 open question, the "Rules engine" badge and the toast "Insights saved to MongoDB" |
| 6 | Click the **00:38** chip on the payment-bugs item | The transcript scrolls to Rahul's line and highlights it |
| 7 | Tick "Fix the two payment bugs" | It is struck through; the overview card shows 1/3 done and the sidebar badge shows 2 |
| 8 | Click **Copy** on Action items | The toast "Action items copied" appears; the clipboard holds a checklist with owners and deadlines |
| 9 | Ask: "Who is fixing the payment bugs?" | "Grounded in transcript", quoting Rahul at 00:38 |
| 10 | Ask: "When is the launch date?" | "Not covered by the meeting", with the closest related line |
| 11 | Ask: "Will premium features be free?" | "This was raised but not resolved", quoting 01:01 and 01:08 |
| 12 | Open **Decisions** in the sidebar | Decisions with quotes in the original language, plus Open questions |
| 13 | Open **Action items** and use the Pending/Done filters | The list filters |
| 14 | Open **Settings** | API URL, Connected status, "MongoDB connected", "Stored in MongoDB" and the AI engine |
| 15 | Reload the browser page | The summary, the ticked item and the Q&A history come back from MongoDB |
| 16 | Click **Reset sample** | Everything clears and the toast "Saved insights and questions were cleared in MongoDB" appears |

## Example questions

| Question | Expected answer (rules engine) |
|---|---|
| Who is fixing the payment bugs? | Rahul Banerjee, "by Friday" (00:38) |
| What did the team decide? | Android first; invite-only beta for 500 users |
| What are the action items? | 3 items, with owners and deadlines where stated |
| Will premium features be free? | Raised but not resolved; waiting on finance |
| What about iOS? | iOS follows later (00:15) |
| When is the launch date? | Not enough information |
| What is the marketing budget? | Not enough information |
| What are the open questions? | The premium-features pricing question |

## Fallback demo procedure

- **No Gemini key (the default).** The demo works as above with the "Rules engine" badge. Say: "This is the deterministic engine; with a key it switches to Gemini, with the same validation."
- **Gemini fails during the demo.** The backend falls back to rules automatically; the badge shows "Rules engine".
- **MongoDB down.** The backend still starts. The header shows **Demo mode · not saved**, the built-in sample loads, and analysis and Q&A still work through the backend rules engine. Toasts say the results weren't saved, and a reload clears them. Say: "Persistence is off because the database is down; the app never pretends to save."
- **Backend down.** Stop uvicorn, or never start it. The sidebar shows "Offline mode", **Generate intelligence** still works with an "Offline rules" badge and a warning toast, and Q&A answers carry an "Offline" badge. The results are identical, because the in-browser engine mirrors the backend rules.
- **Frontend broken.** Show the API at http://localhost:8000/docs and run `POST /api/meetings/analyze` with the demo meeting from `GET /api/meetings/demo`.
