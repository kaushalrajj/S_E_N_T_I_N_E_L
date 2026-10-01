# Assignment PDF submission — lagane aur test karne ke steps

Bhai, code tumhari di hui ZIP ke current code par bana hai. Yeh package sirf badli hui aur nayi files deta hai. Tumhare original local project ko automatically edit, commit ya push nahi kiya gaya.

## Feature mein kya milega

- Student apne group ke assignment ya general assignment par ek PDF submit kar sakta hai.
- Maximum PDF size 4 MB. Naam, MIME type aur PDF header/end marker check hote hain.
- Submit ke baad student ko **Submitted**, file ka naam aur submission time dikhega. Refresh par bhi database se yahi status aayega.
- Submit ki hui PDF dobara replace nahi hogi. Do requests ek saath bhejne par bhi ek hi submission save hoga.
- Deadline par submission band. Upload deadline se pehle poora hokar database mein save hona chahiye.
- Teacher assignment card ke **View student submissions** button se student ka naam, email, Submitted/Not submitted, PDF aur time dekh sakta hai.
- Student apni PDF aur assignment banane wala teacher us assignment ki PDFs khol/download kar sakta hai.
- Khula teacher panel har 15 seconds aur browser par wapas aane par update hota hai; Refresh button bhi hai.
- Bina deadline wale assignments bhi dikhenge; unka submission khula rahega.

## 1. Files apne local project mein lagao

1. ZIP ko alag folder mein extract karo.
2. Apne project ka terminal kholo aur `git branch --show-current` chalao. Result `feature/assignment-submission` hona chahiye.
3. `git status --short` se apne existing changes dekh lo. Review ke waqt tumhare local `AuthContext.jsx`, `db.js`, `middleware/auth.js` aur `routes/auth.js` mein pehle se changes the. Unka backup rakhna. Is package ke existing files tumhari di hui ZIP se banaye gaye hain; relevant original files review ke waqt local copy se match karte the.
4. Extracted package ke **client** aur **server** folders ko apne project ke andar copy karo; same naam wali files replace/merge karo. Poora project folder delete karke replace mat karna. Apni `.git`, `.env` aur `node_modules` files rehne do.
5. Yeh guide bhi project ke root mein rakh sakte ho.

ZIP mein `.env`, secrets, `.git` aur installed dependencies include nahi hain. Koi naya npm dependency add nahi hua.

## 2. Supabase mein submission table banao — zaroori

Code copy karne ke saath yeh step bhi karna hai, warna submission table missing error aayega.

1. Backend ke `SUPABASE_URL` se identify karo ki project kaunsa Supabase project use karta hai.
2. Usi project ka **SQL Editor** kholo.
3. `server/config/migrations/assignment_submissions.sql` ka poora code copy karke ek new query mein run karo.
4. Query successful hone par `assignment_submissions` table ban jayegi. Script existing assignments/students ko preserve karti hai aur dobara bhi run kar sakte ho.

Agar Supabase access group ke owner ke paas hai, use sirf yeh migration file run karne ko do. Existing database par poori `schema.sql` dobara chalana is feature ke liye zaroori nahi hai. Fresh database ho to base schema ke baad yeh migration run hogi.

## 3. Server settings check karo

Apne `server/.env` mein in names ki actual values honi chahiye:

```dotenv
SUPABASE_URL=your-existing-project-url
SUPABASE_SERVICE_ROLE_KEY=your-project-service-role-key
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret
```

Yahan values placeholders hain; apne project ki actual values local file mein rakho. Existing JWT/SMTP settings ko preserve karo. **Service role key sirf server par rakho; client, screenshots ya GitHub mein mat dalo.** App apna JWT login use karti hai, isliye nayi submission table server ke through access hoti hai; anon key akeli is feature ke liye kaafi nahi hai.

Local test ke liye `client/.env` ka `VITE_API_URL` local backend ki taraf ho, jaise `http://localhost:3000/api`; warna local frontend bhi live server ko request bhej sakta hai. Server ka `FRONTEND_URL` local frontend se match ho. Settings badalne ke baad dono dev servers restart karo.

Cloudinary par PDF save hoti hai; Supabase mein student/assignment/file ki details save hoti hain. Is feature ki PDF authenticated storage use karti hai. File kholne par backend access check karke 2-minute ka signed link deta hai.

## 4. Project chalao aur test karo

Project root par do terminals mein:

```powershell
npm --prefix server run dev
```

```powershell
npm --prefix client run dev
```

Phir:

1. Teacher login karo. Group banao/select karo aur apne student account ko member banao.
2. Future deadline wala assignment publish karo. Teacher ke browser ka local time UTC mein convert hokar save hoga.
3. Alag browser/incognito mein student login karo. Assignment kholo; 4 MB se chhoti PDF choose karke **Submit PDF** dabao.
4. **Submitted**, PDF name aur time check karo. Page refresh karke bhi check karo.
5. Teacher par wahi assignment kholo aur **View student submissions** dabao. Student ki PDF **View PDF** aur **Download PDF** se check karo.
6. Dobara submit karne ka option nahi hona chahiye. Dusre student ki pending entry alag dikhegi.
7. Ek naya assignment bahut paas ki deadline ke saath banao. Deadline ke baad student ko **Submission closed** aur disabled submission flow milna chahiye.

Database/storage configure na ho to UI actual error dikhayegi; successful submission pretend nahi karegi. Supabase bilkul configure na ho to existing project ka temporary memory mode chalega, jisme server restart par data reset hota hai. Real testing ke liye Supabase use karo.

## 5. Automated checks

Project root se:

```powershell
npm --prefix server run test:submissions
npm --prefix client run build
npm --prefix client run lint
```

Verification: **15 backend integration tests pass**, frontend production build pass, lint exit code 0. Existing project files mein lint warnings abhi hain; naye submission components par warnings nahi mili.

Tests temporary memory database aur mocked Cloudinary use karte hain; real accounts/database ko touch nahi karte. Inmein successful upload/readback, permissions, duplicate/concurrent submission, invalid/oversized PDF, deadline crossing, cleanup aur lost database response cover hain. **Real Supabase migration, real Cloudinary upload/download aur browser mein poora flow abhi verify nahi hua**; step 4 se apne configured environment mein verify karo.

## Changed files ka map

| File | Kaam |
| --- | --- |
| `client/src/api/apiClient.js` | Submission aur PDF access API calls |
| `client/src/components/StudentAssignmentSubmission.jsx` | Student upload, Submitted/closed state |
| `client/src/components/TeacherAssignmentSubmissions.jsx` | Teacher submission list aur refresh |
| `client/src/components/SubmissionFileActions.jsx` | PDF view/download controls |
| `client/src/components/assignmentSubmissions.css` | In controls ka style |
| `client/src/pages/StudentDashboard.jsx` | Dono assignment views mein student controls |
| `client/src/pages/TeacherDashboard.jsx` | Dono views mein teacher controls aur timezone conversion |
| `server/config/db.js` | Submission save/read aur general assignment visibility |
| `server/config/schema.sql` | Fresh setup ke liye migration note |
| `server/config/migrations/assignment_submissions.sql` | Table, unique submission constraint, deadline trigger aur permissions |
| `server/services/assignmentRules.js` | PDF/deadline validation aur safe response fields |
| `server/services/assignmentSubmissions.js` | Upload, access, teacher list, private PDF links |
| `server/routes/student.js` | Student submission routes |
| `server/routes/teacher.js` | Teacher submission routes, related group ownership checks |
| `server/tests/assignment-submissions.test.js` | 15 automated tests |
| `server/package.json` | Test command |

Local test ke baad `git diff` se changes dekhkar apne feature branch par commit/push karna. Pehle se jo unrelated local changes the unhe review karke hi stage karna. Is package ne koi commit ya PR create nahi kiya hai. Live deploy ke time backend/frontend dono ka new code, migration aur backend environment settings lagni chahiye.

Implementation references: [Vercel payload limits](https://vercel.com/docs/functions/limitations), [Cloudinary access control](https://cloudinary.com/documentation/control_access_to_media).
