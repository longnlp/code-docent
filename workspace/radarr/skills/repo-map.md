# Repo Map (skill file — where things live; agents consult this before exploring)

Seeded automatically by the Pass 0 pre-scan; the admin adds hints over time
(gap investigations are a natural source).

- UI routes (all pages): `frontend/src/App/AppRoutes.tsx`
- Page components: `frontend/src/<FeatureName>/` (e.g. `frontend/src/AddMovie/`)
- REST API (v3): `src/Radarr.Api.V3/<Area>/<Name>Controller.cs`
- Business logic: `src/NzbDrone.Core/<Area>/` (e.g. `src/NzbDrone.Core/Movies/`)
- **User-facing strings (all of them)**: `src/NzbDrone.Core/Localization/Core/en.json` (2,051 keys)
- Validation rules: `src/NzbDrone.Core/Validation/` + FluentValidation validators near their features (95 files)
- Backend tests (expected behavior): `src/NzbDrone.Core.Test/<Area>Tests/`
