# Age rating (Apple) and content rating (Google): draft answers (Stage 4.3)

Facts about the app: job listings for healthcare professionals, profile/CV builder, applications, push notifications,
fixed links opened in the system browser sheet (privacy, terms, offer letters, official government notification pages).
No user content shown to other users, no messaging, no ads, no purchases, no gambling, no violence, no medical advice.

## Apple age rating questionnaire (App Store Connect, the questionnaire in force since January 31, 2026)

Reference: `STORE-RULES.md` "Age rating". Answer every content descriptor **None**; capabilities as below.

| Section | Answer |
| --- | --- |
| In-App Controls: Parental controls, Age assurance | None |
| Capabilities: User-generated content | No (profiles and CVs go to the hospital the candidate applies to, not to other users) |
| Capabilities: Social media | No |
| Capabilities: Messaging and chat | No |
| Capabilities: Advertising | No |
| Capabilities: Unrestricted web access | **No** (only fixed links in the system browser sheet; no address bar in the app) |
| Mature themes, Sexuality or nudity, Violence | None |
| Medical or Wellness: Medical or treatment information | None (job adverts for nurses and doctors are not treatment information) |
| Chance-based activities | None |
| Age categories and override | "Not Applicable"; **optional:** override to a higher rating if the client prefers 18+ to match the Google target audience |

Expected calculated rating: **4+**. Made for Kids: No.

## Google Play content rating (IARC questionnaire)

| Step | Answer |
| --- | --- |
| Email address | client's address |
| Category | **Utility, Productivity, Communication, or Other** (not Game, not Social) |
| Violence, sexuality, language, controlled substances | No to all |
| Does the app allow users to interact or exchange content with other users? | No |
| Does the app share the user's current location? | No |
| Does the app allow users to purchase digital goods? | No |
| Does the app contain ads? | No |
| Does the app allow users to access the internet unrestricted (web browser)? | No |
| Gambling / simulated gambling | No |

Expected: **Everyone** (ESRB), PEGI 3, IARC 3+.

## Google Play target audience and content

- Target age group: **18 and over** only; tick **Restrict Minor Access**.
- Ads: No. Government app: No. Health app: No. Financial features: No. News app: No. COVID-19: No.
- Data safety: `DATA-SAFETY-GOOGLE.md`. App access: demo account (`REVIEW-NOTES.md`).
