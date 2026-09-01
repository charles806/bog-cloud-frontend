# BOG Cloud — Full Project Folder Structure

Plain HTML/CSS/JS, no frameworks, no build tools.
This is the complete long-term structure based on the PRD. ✅ = build now (MVP). 🔜 = scaffolded, build later.

```
BOG-Full/
├── index.html                              ✅ MVP
│
├── auth/
│   ├── login.html                          ✅ MVP
│   ├── signup.html                         ✅ MVP
│   ├── verify-otp.html                     ✅ MVP
│   ├── reset-password.html                 ✅ MVP
│   ├── mfa.html                             ✅ MVP
│   └── sso.html                             🔜 Future — Enterprise SAML/OAuth SSO
│
├── dashboard/
│   ├── dashboard.html                      ✅ MVP
│   ├── trash.html                           ✅ MVP
│   ├── vault.html                           ✅ MVP
│   ├── vault-entry.html                     🔜 Future — add/edit single credential
│   ├── password-generator.html              🔜 Future
│   ├── breach-monitor.html                  🔜 Future — HaveIBeenPwned integration
│   └── share-link.html                      🔜 Future — time-limited file sharing
│
├── account/
│   ├── profile.html                        ✅ MVP
│   ├── devices.html                         ✅ MVP
│   ├── sessions.html                        ✅ MVP
│   └── billing.html                         ✅ MVP
│
├── admin/
│   ├── admin-dashboard.html                ✅ MVP
│   ├── billing.html                         ✅ MVP
│   ├── analytics.html                       ✅ MVP
│   ├── storage-analysis.html                ✅ MVP
│   ├── users.html                           ✅ MVP
│   └── manage-users.html                    ✅ MVP
│
├── marketing/
│   ├── pricing.html                        ✅ MVP
│   ├── about.html                           🔜 Future
│   ├── contact.html                         🔜 Future
│   ├── terms.html                           🔜 Future
│   └── privacy.html                         🔜 Future
│
├── devcloud/                                🔜 Future — entire module
│   ├── devcloud-dashboard.html
│   ├── api-keys.html
│   ├── deployments.html
│   ├── environments.html
│   └── logs.html
│
├── teams/                                   🔜 Future — entire module
│   ├── team-dashboard.html
│   ├── invite-members.html
│   └── roles-permissions.html
│
└── assets/
    ├── css/styles.css                      ✅ MVP
    └── js/firebase-config.js                ✅ MVP
```

## How to work with this

- Build out the ✅ files first — that's your MVP (20 screens).
- Leave the 🔜 files empty until the business scales — they exist now so the structure never has to be reorganized later.
- Nothing about adding real content to the 🔜 folders will require moving or renaming anything in the ✅ folders.

## Not included here (separate projects, not HTML screens)

- Browser extension (Chrome/Firefox/Edge/Safari) — Manifest V3, separate codebase
- Native mobile apps (iOS/Android) — React Native, separate codebase
