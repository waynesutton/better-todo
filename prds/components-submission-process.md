# Convex components submission process

A guide for how community components move from submission to the official Convex Components directory.

## Why this process exists

The Convex Components directory at [convex.dev/components](https://www.convex.dev/components) is a curated collection of production-ready building blocks. Community developers want to contribute. We want quality control without bottlenecking innovation.

This process does three things:

1. Gives community developers a clear path to contribute
2. Maintains quality standards for the directory
3. Reduces review burden on the Convex team through AI-assisted screening

## The submission flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         COMPONENT SUBMISSION FLOW                           │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌───────────────────────┐
     │  Developer builds     │
     │  component + README   │
     └───────────┬───────────┘
                 │
                 ▼
     ┌───────────────────────┐
     │  Submit via           │
     │  /components/submit   │
     │  + thumbnail upload   │
     └───────────┬───────────┘
                 │
                 ▼
     ┌───────────────────────┐
     │     AI REVIEW         │
     │  ─────────────────    │
     │  • npm exists?        │
     │  • README quality     │
     │  • Best practices     │
     │  • Security check     │
     └───────────┬───────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
   ┌─────────┐       ┌─────────┐
   │  PASS   │       │  FLAG   │
   │ (auto)  │       │(review) │
   └────┬────┘       └────┬────┘
        │                 │
        │                 ▼
        │        ┌───────────────────────┐
        │        │     TEAM REVIEW       │
        │        │  /submit/admin        │
        │        │  ─────────────────    │
        │        │  • Technical check    │
        │        │  • Docs quality       │
        │        │  • Production ready   │
        │        └───────────┬───────────┘
        │                    │
        │           ┌────────┴────────┐
        │           ▼                 ▼
        │      ┌─────────┐       ┌─────────┐
        │      │ APPROVE │       │ REJECT  │
        │      └────┬────┘       └────┬────┘
        │           │                 │
        ▼           ▼                 ▼
   ┌─────────────────────┐    ┌─────────────────────┐
   │  Added to official  │    │  Feedback sent      │
   │  /components        │    │  via public comment │
   │  directory          │    │                     │
   └─────────────────────┘    │  Author follows up: │
                              │  • GitHub issues    │
                              │  • Discord channel  │
                              └─────────────────────┘
```

## Step by step process

### 1. Developer prepares component

- Component follows [Convex authoring guidelines](https://docs.convex.dev/components/authoring)
- README includes installation, usage, and API reference
- Package published to npm with `@convex-dev/` prefix or custom namespace

### 2. Submit for review

- Go to [convex.dev/components/submit](https://www.convex.dev/components/submit)
- Provide npm package name, with GitHub repo link, and description imported from npm
- Upload custom thumbnail by generating one at [convex.link/componentgen](https://convex.link/componentgen)with a simle image or logo in the center. if approved for convex official directory.

### 3. AI review if enabled.

The submission app runs an automated check for:

- Package exists on npm
- README quality and completeness
- Code follows Convex best practices
- No security red flags

### 4. Team review

The API team reviews submissions at [convex.dev/components/submit/admin](https://www.convex.dev/components/submit/admin). Login required.

Components flagged by AI review or marked for manual inspection get verified for:

- Technical correctness
- Production readiness
- Clear documentation
- Alignment with directory standards

### 5. Directory listing

Approved components appear on [convex.dev/components](https://www.convex.dev/components) with:

- Custom or generated thumbnail
- Weekly download count
- Direct link to npm and GitHub
- Category assignment (Durable Functions, Database, Integrations, Backend)

## Thumbnail requirements

Community components should have a visual thumbnail. Two options:

1. **Custom design**: 400x300px PNG or SVG, consistent with existing directory style by convex team
2. **Generator**: Use [convex.link/componentgen](https://convex.link/componentgen) to create a styled thumbnail

### Store your thumbnail in GitHub

Component authors should commit their directory thumbnail to their GitHub repo. Recommended location:

```
your-component/
├── .github/
│   └── component-thumbnail.png    ← suggested location
├── src/
├── convex/
├── package.json
└── README.md
```

This keeps the asset versioned alongside your code. If you update the thumbnail later, the submission app can pull the latest version directly from your repo.

Include a reference in your README:

```markdown
## Directory thumbnail

![Component thumbnail](.github/component-thumbnail.png)
```

## Quarterly maintenance review

**Recommendation for the API team**: Review community components every quarter to verify:

- Package still maintained (commits in last 90 days or documented stable status)
- No open critical issues unaddressed for 30+ days
- Download trends (declining usage may indicate deprecation candidate)
- Convex version compatibility

Components that fail quarterly review get: 0. Removed from /components direcotry

1. First quarter: Warning badge and maintainer notification
2. Second quarter: Moved to "Archived" section or removed

## Team communication and feedback

The [admin dashboard](https://www.convex.dev/components/submit/admin) includes internal notes and public comments to keep the review process organized.

### Internal notes (team only)

Team members can leave private notes on any submission via the admin dashboard. Use these for:

- Flagging concerns for another reviewer
- Documenting conversations with the component author
- Recording decisions and reasoning for future reference
- Tagging submissions for quarterly review follow-up

Notes are visible only to authenticated Convex team members. They persist across review sessions.

### Public comments

Public comments are visible to the component author and serve as the official feedback channel. Use these for:

- Requesting specific changes before approval
- Acknowledging receipt and estimated review timeline
- Providing rejection reasons with actionable suggestions
- Celebrating accepted submissions

Keep public comments professional and constructive. Authors see these as the voice of Convex.

### Author follow-up channels

Component authors should not reply within the submissions app. Direct them to:

1. **GitHub repo issues**: For technical questions, bug reports, or feature requests related to their component
2. **Component Authoring Discord channel**: For general questions about the submission process, best practices, or connecting with other authors

Include this guidance in rejection and revision request messages:

> For questions about this feedback, open an issue on your component's GitHub repo or ask in the Component Authoring channel on Discord.

## Process legend

| Item                        | Location                                                                                     | Who uses it        |
| --------------------------- | -------------------------------------------------------------------------------------------- | ------------------ |
| Official directory          | [convex.dev/components](https://www.convex.dev/components)                                   | Everyone           |
| Submission form             | [convex.dev/components/submit](https://www.convex.dev/components/submit)                     | Developers         |
| Admin dashboard             | [convex.dev/components/submit/admin](https://www.convex.dev/components/submit/admin)         | API team (login)   |
| Thumbnail generator         | [convex.link/componentgen](https://convex.link/componentgen)                                 | Developers         |
| Authoring docs              | [docs.convex.dev/components/authoring](https://docs.convex.dev/components/authoring)         | Developers         |
| Understanding components    | [docs.convex.dev/components/understanding](https://docs.convex.dev/components/understanding) | Everyone           |
| Component Authoring Discord | #component-authoring channel in Convex Discord                                               | Developers         |
| Submission app repo         | Internal (this app)                                                                          | Convex engineering |

## What if scenarios and improvements

### What if we get 1000 components?

**Challenge**: Manual review becomes impossible. Team burns out.

**Solutions**:

- AI review handles 80% of submissions automatically (approve/reject with confidence scores)
- Human review only for edge cases and flagged submissions
- Community voting system surfaces quality components
- Rate limit submissions per developer to 2 per month

### What if we get very few submissions?

**Challenge**: Directory looks empty. Community feels uninvited.

**Solutions**:

- Launch with 10-15 strong first-party components (already done)
- Personal outreach to active Convex developers building reusable patterns
- Highlight submissions in weekly newsletter and Discord
- Lower barrier: Accept "experimental" category for WIP components

### Marketing suggestions to drive submissions

**Developer incentives that work**:

1. **Recognition**: Featured component spotlight on Stack blog
2. **Swag**: Convex swag + stickers for first 50 accepted components
3. **Community**: "Component Author" role in Discord

**Components challenge rewards**:

Selected components will receive:

- Featured on the Components Directory
- $100 gift card
- Convex swag

**Challenge timeline**:

- December 2nd: Components challenge starts
- January 23rd: Deadline for submissions (10:00 AM PT)
- Submissions approved on a rolling basis

**Judges**: Convex team members

## Component licensing

Licensing matters. The wrong license can block adoption or create legal friction for developers building production apps.

### Recommended licenses

| License                         | Why it works                                   | Notes                                                   |
| ------------------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| MIT                             | Simple, permissive, widely understood          | Best default choice for most components                 |
| Apache 2.0                      | Permissive with patent protection              | Good for components with novel implementations          |
| FSL (Functional Source License) | Source available with time-delayed open source | Works for components where authors want some protection |
| BSD 2-Clause                    | Minimal restrictions, corporate friendly       | Alternative to MIT with similar terms                   |

### Licenses to avoid

**GPL and LGPL**: These licenses require derivative works to use the same license. If a developer imports a GPL component into their app, their entire app may need to be GPL licensed. This creates friction for commercial projects and limits adoption.

**Proprietary or custom licenses**: Without legal review, developers will skip your component rather than risk compliance issues.

### The goal

A good component license allows this scenario:

1. Developer imports your component to build an app (example: a fantasy football app)
2. That app can be MIT licensed
3. Someone forks and tweaks the app
4. The fork competes commercially with the original app
5. None of this violates your component's terms

This is the desired outcome. Components should enable building, not restrict it.

### FSL Apache variant

The Functional Source License with Apache 2.0 eventual license (FSL Apache) offers a middle path:

- Source code is available immediately
- Commercial use restrictions apply for a defined period (typically 2 years)
- After the restriction period, the code converts to Apache 2.0
- Developers can still use the component in their apps during the restriction period

This works when component authors want to prevent direct competition (someone forking and selling the component itself) while still allowing downstream app development.

**Note**: Consult with legal counsel before choosing FSL for your component. The examples above are suggestions, not legal advice.

### Include your license

Every component submission must include:

- LICENSE file in the repo root
- License field in package.json
- License badge in README (optional but recommended)

## Public repository requirement

Component repos must be public. Private repos are not accepted.

### Why public?

1. **Transparency**: Developers can review the code before adding a dependency
2. **Trust**: Open source builds confidence in production use
3. **Community**: Public repos enable issues, PRs, and forks
4. **Verification**: AI review and team review both require repo access

### What counts as public

- GitHub public repository (preferred)
- GitLab public project
- Bitbucket public repository
- Other public git hosts with web access

### What does not count

- Private repos with "collaborator" access for reviewers
- Self-hosted git without public web access
- Source code published only as npm tarball

If your component contains proprietary business logic you cannot open source, the Convex Components directory is not the right distribution channel.

## Open questions for the team

1. Should AI review be fully automated for clear approvals, or always require human sign-off?
2. Do we want a "Community" badge vs "Official" badge distinction in the directory?
3. What's the threshold for removal (downloads, maintenance, issues)?
4. Should we allow paid/commercial components, or free only?
5. Do we accept FSL licensed components, or require fully permissive licenses only?

---

_Document author: Mike W._  
_Last updated: November 2024_
