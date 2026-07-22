---
title: Calendar
feature: calendar
state: draft
audience:
  - product
  - qa
  - support
source_commit: c7cf91c
generated: 2026-07-14
verified: false
runtime: claude-cli
facts:
  - id: f1
    category: ui
    claim: The Calendar page lives at /calendar; its toolbar offers 'iCal Link',
      'RSS Sync', 'Search for Missing' on the left and 'Options' plus a filter
      menu on the right.
    anchors:
      - frontend/src/App/AppRoutes.tsx:76
      - frontend/src/Calendar/CalendarPage.tsx:159-198
    evidence: label={translate('ICalLink')} ... label={translate('RssSync')} ...
      label={translate('SearchForMissing')} ... label={translate('Options')}
  - id: f2
    category: ui
    claim: Default view is Month on screens wider than 768px and Day otherwise; the
      chosen view, selected filter, and display options persist across sessions.
    anchors:
      - frontend/src/Store/Actions/calendarActions.js:39
      - frontend/src/Store/Actions/calendarActions.js:96-101
    evidence: "view: window.innerWidth > 768 ? 'month' : 'day' ... persistState =
      ['calendar.view', 'calendar.selectedFilterKey', 'calendar.options', ...]"
  - id: f3
    category: ui
    claim: Five views are available — Month, Week, Forecast, Day, Agenda — switched
      from the header; the Month option is hidden on small screens.
    anchors:
      - frontend/src/Calendar/Header/CalendarHeader.tsx:130-171
      - frontend/src/Calendar/calendarViews.ts:1-7
    evidence: "{isSmallScreen ? null : (<ViewMenuItem name=\"month\" ... )} ...
      'week' ... 'forecast' ... 'day' ... 'agenda'"
  - id: f4
    category: ui
    claim: The default calendar filter is 'Monitored Only'; the built-in alternative
      is 'All', and custom filters can be built on 'Include Unmonitored' and
      'Tags'.
    anchors:
      - frontend/src/Store/Actions/calendarActions.js:53-93
    evidence: "selectedFilterKey: 'monitored' ... label: () =>
      translate('MonitoredOnly') ... filterBuilderProps: [{ name: 'unmonitored'
      ... }, { name: 'tags' ... }]"
  - id: f5
    category: ui
    claim: In Agenda view the Previous, Next, and 'Today' navigation buttons are
      disabled; Agenda always shows yesterday through one month ahead.
    anchors:
      - frontend/src/Calendar/Header/CalendarHeader.tsx:90-112
      - frontend/src/Store/Actions/calendarActions.js:152-155
    evidence: isDisabled={view === 'agenda'} ... start = time.clone().subtract(1,
      'day') ... end = time.clone().add(1, 'month')
  - id: f6
    category: ui
    claim: Forecast view starts at yesterday and auto-sizes between 3 and 7
      day-columns based on window width (minimum 120px per column);
      Previous/Next jump by the visible day count.
    anchors:
      - frontend/src/Calendar/CalendarPage.tsx:37
      - frontend/src/Calendar/CalendarPage.tsx:147-150
      - frontend/src/Store/Actions/calendarActions.js:142-145
      - frontend/src/Store/Actions/calendarActions.js:366-367
    evidence: "MINIMUM_DAY_WIDTH = 120 ... Math.max(3, Math.min(7, Math.floor(width
      / MINIMUM_DAY_WIDTH))) ... amount = view === calendarViews.FORECAST ?
      dayCount : 1"
  - id: f7
    category: ui
    claim: "Events are color-coded by status with this priority: downloading (queue)
      > downloaded+monitored > downloaded+unmonitored >
      missing+monitored+available > missing+unmonitored > unreleased."
    anchors:
      - frontend/src/Calendar/getStatusStyle.ts:1-33
    evidence: if (downloading) { return 'queue'; } if (hasFile && isMonitored) {
      return 'downloaded'; } ... return 'continuing';
  - id: f8
    category: ui
    claim: "The legend below the calendar labels the six statuses verbatim:
      'Downloaded (Monitored)', 'Downloaded (Unmonitored)', 'Missing
      (Monitored)', 'Missing (Unmonitored)', 'Queued', 'Unreleased'."
    anchors:
      - frontend/src/Calendar/Legend/Legend.tsx:36-87
      - src/NzbDrone.Core/Localization/Core/en.json:581-582
      - src/NzbDrone.Core/Localization/Core/en.json:1102-1104
    evidence: '"DownloadedAndMonitored": "Downloaded (Monitored)",
      "MissingMonitoredAndConsideredAvailable": "Missing (Monitored)"'
  - id: f9
    category: ui
    claim: Each event shows the movie title; with 'Show Movie Information' on
      (default), it also shows at most the first 2 genres, the release type(s)
      falling on that day (Cinemas/Digital/Physical), and the certification.
    anchors:
      - frontend/src/Calendar/Events/CalendarEvent.tsx:71
      - frontend/src/Calendar/Events/CalendarEvent.tsx:74-112
      - frontend/src/Calendar/Events/CalendarEvent.tsx:162-174
      - frontend/src/Store/Actions/calendarActions.js:45
    evidence: "const joinedGenres = genres.slice(0, 2).join(', '); ...
      types.push('Cinemas'); ... showMovieInformation: true"
  - id: f10
    category: ui
    claim: "Calendar Options 'Local' section: Show Movie Information (default on),
      Show Cinema/Digital/Physical Release (all default on), Icon for Cutoff
      Unmet (default off), Full Color Events (default off); the last remaining
      enabled release-type checkbox is disabled so all three can never be off at
      once."
    anchors:
      - frontend/src/Calendar/Options/CalendarOptionsModalContent.tsx:106-154
      - frontend/src/Store/Actions/calendarActions.js:44-51
    evidence: "isDisabled={showCinemaRelease && !showDigitalRelease &&
      !showPhysicalRelease} ... showCutoffUnmetIcon: false, fullColorEvents:
      false"
  - id: f11
    category: ui
    claim: Calendar Options 'Global' section (First Day of Week, Week Column Header,
      Time Format, Enable Color Impaired Mode) saves to server-side UI settings
      immediately on change, unlike the Local section which is per-browser.
    anchors:
      - frontend/src/Calendar/Options/CalendarOptionsModalContent.tsx:68-75
      - frontend/src/Calendar/Options/CalendarOptionsModalContent.tsx:182-232
    evidence: "dispatch(saveUISettings({ [name]: value }));"
  - id: f12
    category: ui
    claim: "'Search for Missing' is disabled unless the visible date range contains
      monitored-range movies with a cinema release date in the past, no file,
      and no active download in the queue."
    anchors:
      - frontend/src/Calendar/CalendarPage.tsx:39-66
      - frontend/src/Calendar/CalendarPage.tsx:174-180
    evidence: "!movie.movieFileId && inCinemas && ... isBefore(inCinemas) &&
      !queueDetails.some(...) ... isDisabled={!missingMovieIds.length}"
  - id: f13
    category: ui
    claim: If the library has no movies at all, the calendar page instead shows *"No
      movies found, to get started you'll want to add a new movie or import some
      existing ones."* with 'Import Existing Movies' and 'Add New Movie'
      buttons.
    anchors:
      - frontend/src/Calendar/CalendarPage.tsx:105
      - frontend/src/Movie/NoMovie.tsx:26-38
      - src/NzbDrone.Core/Localization/Core/en.json:1228
    evidence: "\"NoMoviesExist\": \"No movies found, to get started you'll want to
      add a new movie or import some existing ones.\""
  - id: f14
    category: api
    claim: The calendar grid calls GET /api/v3/calendar with start, end, unmonitored
      (sent as false when the filter doesn't set it) and optional tags
      (comma-separated); server defaults when omitted are start=today,
      end=today+2 days.
    anchors:
      - frontend/src/Store/Actions/calendarActions.js:272-284
      - src/Radarr.Api.V3/Calendar/CalendarController.cs:49-52
    evidence: "url: '/calendar' ... var startUse = start ?? DateTime.Today; var
      endUse = end ?? DateTime.Today.AddDays(2);"
  - id: f15
    category: api
    claim: The iCal feed is GET /feed/v3/calendar/Radarr.ics with parameters
      pastDays (default 7), futureDays (default 28), tags, unmonitored (default
      false), releaseTypes (CinemaRelease/DigitalRelease/PhysicalRelease).
    anchors:
      - src/Radarr.Api.V3/Calendar/CalendarFeedController.cs:16-29
      - src/Radarr.Http/VersionedFeedControllerAttribute.cs:11-12
      - src/Radarr.Api.V3/Calendar/CalendarReleaseType.cs:3-8
    evidence: GetCalendarFeed(int pastDays = 7, int futureDays = 28, string tags =
      "", bool unmonitored = false, IReadOnlyCollection<CalendarReleaseType>
      releaseTypes = null)
  - id: f16
    category: rule
    claim: A movie appears on the calendar if ANY of its three release dates (in
      cinemas, physical, digital) falls within the requested range; unmonitored
      movies are excluded unless explicitly requested.
    anchors:
      - src/NzbDrone.Core/Movies/MovieRepository.cs:236-249
    evidence: (m.MovieMetadata.Value.InCinemas >= start && ... <= end) ||
      (PhysicalRelease ...) || (DigitalRelease ...); if (!includeUnmonitored) {
      builder.Where<Movie>(x => x.Monitored == true); }
  - id: f17
    category: rule
    claim: Calendar API results are sorted by in-cinemas date, then digital release
      date, then physical release date.
    anchors:
      - src/Radarr.Api.V3/Calendar/CalendarController.cs:79-83
    evidence: .OrderBy(m => m.InCinemas).ThenBy(m => m.DigitalRelease).ThenBy(m =>
      m.PhysicalRelease)
  - id: f18
    category: rule
    claim: The tags parameter (calendar API and iCal feed) keeps only movies with at
      least one matching tag; each value may be a numeric tag ID or a tag label
      (all-digit values are treated as IDs).
    anchors:
      - src/Radarr.Api.V3/Calendar/CalendarController.cs:57-72
      - src/NzbDrone.Core/Tags/TagService.cs:71-81
    evidence: if (tag.All(char.IsDigit)) { return _repo.Get(int.Parse(tag)); } else
      { return _repo.GetByLabel(tag); }
  - id: f19
    category: rule
    claim: The iCal feed creates up to three separate all-day events per movie, with
      the movie title suffixed '(Theatrical Release)', '(Digital Release)', or
      '(Physical Release)'; events for movies still in 'Announced' status are
      marked Tentative, all others Confirmed.
    anchors:
      - src/Radarr.Api.V3/Calendar/CalendarFeedController.cs:57-70
      - src/Radarr.Api.V3/Calendar/CalendarFeedController.cs:103-114
    evidence: "occurrence.Status = movie.Status == MovieStatusType.Announced ?
      EventStatus.Tentative : EventStatus.Confirmed; ... occurrence.IsAllDay =
      true;"
  - id: f20
    category: failure
    claim: If loading calendar data fails, the page shows the message *"Unable to
      load the calendar"* (no retry button; navigating or changing view
      refetches).
    anchors:
      - frontend/src/Calendar/Calendar.tsx:142-144
      - src/NzbDrone.Core/Localization/Core/en.json:180
    evidence: '"CalendarLoadError": "Unable to load the calendar"'
  - id: f21
    category: failure
    claim: "The iCal modal's 'Show as All-Day Events' checkbox (help text *\"Events
      will appear as all-day events in your calendar\"*) has NO effect: it adds
      asAllDay=true to the URL, but the feed controller accepts no such
      parameter and always emits all-day events."
    anchors:
      - frontend/src/Calendar/iCal/CalendarLinkModalContent.tsx:79-81
      - src/Radarr.Api.V3/Calendar/CalendarFeedController.cs:29
      - src/Radarr.Api.V3/Calendar/CalendarFeedController.cs:109
      - src/NzbDrone.Core/Localization/Core/en.json:762-763
    evidence: icalUrl += 'asAllDay=true&'; — vs — GetCalendarFeed(int pastDays = 7,
      int futureDays = 28, string tags = "", bool unmonitored = false, ...) ...
      occurrence.IsAllDay = true;
  - id: f22
    category: failure
    claim: The generated iCal feed URL embeds the user's API key in plaintext as a
      query parameter (apikey=...), so a shared link grants feed access; support
      should treat shared calendar URLs as secrets.
    anchors:
      - frontend/src/Calendar/iCal/CalendarLinkModalContent.tsx:93
    evidence: icalUrl += `apikey=${encodeURIComponent(window.Radarr.apiKey)}`;
  - id: f23
    category: lifecycle
    claim: While the calendar page is open it auto-refreshes every hour (resetting
      the range to today); it also refetches automatically when a movie refresh
      finishes and when movie files are imported or deleted.
    anchors:
      - frontend/src/Calendar/Calendar.tsx:38
      - frontend/src/Calendar/Calendar.tsx:61-70
      - frontend/src/Calendar/Calendar.tsx:91-102
      - frontend/src/Calendar/Calendar.tsx:117-121
    evidence: const UPDATE_DELAY = 3600000; // 1 hour ...
      registerPagePopulator(repopulate, ['movieFileUpdated',
      'movieFileDeleted']); ... if (wasRefreshingMovie && !isRefreshingMovie) {
      dispatch(fetchCalendar(...)) }
  - id: f24
    category: lifecycle
    claim: The 'RSS Sync' toolbar button queues the RssSync command (the same
      periodic indexer-feed check that otherwise runs every 30 minutes by
      default); the button shows a spinner while the command is executing.
    anchors:
      - frontend/src/Calendar/CalendarPage.tsx:123-129
      - frontend/src/Calendar/CalendarPage.tsx:167-172
      - frontend/src/Commands/commandNames.js:19
      - src/NzbDrone.Core/Configuration/ConfigService.cs:106-110
    evidence: get { return GetValueInt("RssSyncInterval", 30); } ...
      isSpinning={isRssSyncExecuting}
  - id: f25
    category: lifecycle
    claim: "'Search for Missing' queues a MoviesSearch command for the qualifying
      movie IDs; the button spins until that specific command finishes, and any
      resulting grab appears on the event as a queue/downloading indicator."
    anchors:
      - frontend/src/Store/Actions/calendarActions.js:386-397
      - frontend/src/Commands/commandNames.js:20
      - frontend/src/Calendar/CalendarPage.tsx:68-84
    evidence: "name: commandNames.MOVIE_SEARCH ... searchMissingCommandId: data.id"
  - id: f26
    category: lifecycle
    claim: A movie actively downloading shows a circular progress ring on its
      calendar event (progress = 100 − sizeleft/size×100) with queue details in
      a tooltip; a grabbed release not yet in the queue shows a download icon
      titled *"Movie is downloading"*.
    anchors:
      - frontend/src/Calendar/Events/CalendarEventQueueDetails.tsx:33
      - frontend/src/Calendar/Events/CalendarEvent.tsx:135-147
      - src/NzbDrone.Core/Localization/Core/en.json:1164
    evidence: "const progress = size ? 100 - (sizeleft / size) * 100 : 0; ...
      title={translate('MovieIsDownloading')} — \"MovieIsDownloading\": \"Movie
      is downloading\""
  - id: f27
    category: ui
    claim: With 'Icon for Cutoff Unmet' enabled, events whose file quality is below
      the quality profile cutoff show a warning icon titled *"Quality cutoff has
      not been met"*.
    anchors:
      - frontend/src/Calendar/Events/CalendarEvent.tsx:149-158
      - src/NzbDrone.Core/Localization/Core/en.json:1544
    evidence: "movieFile.qualityCutoffNotMet ? (<Icon ...
      title={translate('QualityCutoffNotMet')} — \"QualityCutoffNotMet\":
      \"Quality cutoff has not been met\""
  - id: f28
    category: ui
    claim: In Agenda view each row shows a release-type icon titled 'Physical
      Release', 'Digital Release', or 'In Cinemas'; when multiple release types
      fall on the same day, physical takes precedence over digital, which takes
      precedence over cinema.
    anchors:
      - frontend/src/Calendar/Agenda/AgendaEvent.tsx:60-90
    evidence: "if (physicalRelease && sortDate.isSame(...)) return { eventTitle:
      translate('PhysicalRelease') ... } — checked before digitalRelease and
      inCinemas"
  - id: f29
    category: test
    claim: Integration tests assert the calendar API returns a monitored movie whose
      date falls in range, excludes an unmonitored movie when unmonitored=false,
      and includes it when unmonitored=true (should_be_able_to_get_movies,
      should_not_be_able_to_get_unmonitored_movies,
      should_be_able_to_get_unmonitored_movies).
    anchors:
      - src/NzbDrone.Integration.Test/ApiTests/CalendarFixture.cs:23-70
    evidence: items.Should().HaveCount(1); items.First().Title.Should().Be("Pulp
      Fiction"); ... items.Should().BeEmpty();
  - id: f30
    category: test
    claim: "Coverage gap: no automated tests exist for the iCal feed endpoint
      (release-type filtering, tentative/confirmed status, all-day events), the
      tags filter on the calendar API, or any frontend calendar component;
      CalendarFixture.cs is the only calendar test file."
    anchors:
      - src/NzbDrone.Integration.Test/ApiTests/CalendarFixture.cs:11-13
    evidence: grep for calendar across NzbDrone.Core.Test /
      NzbDrone.Integration.Test matches only CalendarFixture.cs
---

# Calendar

The Calendar page shows your movies' release dates — in cinemas, digital, and physical — on a familiar calendar grid, so you can see at a glance what's coming, what's already downloaded, and what's missing. It also lets you trigger searches for overdue movies and subscribe from an external calendar app. You'll find it in the app at `/calendar` [f1].

## Opening the Calendar

If your library has no movies at all, the page doesn't show a calendar. Instead you'll see the message *"No movies found, to get started you'll want to add a new movie or import some existing ones."* with two buttons: 'Import Existing Movies' and 'Add New Movie' [f13].

With movies in the library, the calendar opens in **Month** view on screens wider than 768px, and **Day** view on narrower screens. Your chosen view, selected filter, and display options are remembered across sessions [f2].

The toolbar offers **iCal Link**, **RSS Sync**, and **Search for Missing** on the left, and **Options** plus a filter menu on the right [f1].

## Choosing a view

Five views are available from the calendar header: **Month**, **Week**, **Forecast**, **Day**, and **Agenda**. The Month option is hidden on small screens [f3].

- **Forecast** starts at yesterday and automatically shows between 3 and 7 day-columns depending on how wide your window is (each column needs at least 120px). The Previous and Next buttons jump forward or back by however many days are currently visible [f6].
- **Agenda** always shows a fixed range: yesterday through one month ahead. Because the range is fixed, the Previous, Next, and 'Today' navigation buttons are disabled in this view [f5].

## What appears on the calendar

A movie appears on the calendar if **any** of its three release dates — in cinemas, physical, or digital — falls within the range you're viewing [f16]. Unmonitored movies are excluded unless you explicitly ask for them [f16].

The filter menu controls this: the default filter is **'Monitored Only'**, the built-in alternative is **'All'**, and you can build custom filters using 'Include Unmonitored' and 'Tags' [f4].

## Reading an event

Each event shows the movie title. With **'Show Movie Information'** turned on (the default), it also shows up to the first 2 genres, which release type(s) fall on that day (Cinemas, Digital, or Physical), and the certification [f9].

Events are color-coded by status. When a movie matches more than one status, this priority order decides the color: downloading (queued) > downloaded and monitored > downloaded and unmonitored > missing, monitored, and considered available > missing and unmonitored > unreleased [f7]. The legend below the calendar labels the six statuses: **'Downloaded (Monitored)'**, **'Downloaded (Unmonitored)'**, **'Missing (Monitored)'**, **'Missing (Unmonitored)'**, **'Queued'**, and **'Unreleased'** [f8].

Extra indicators can appear on an event:

- A movie actively downloading shows a **circular progress ring** (percent complete, based on how much of the download remains) with the download-queue details in a tooltip. A release that has been grabbed but hasn't reached the download queue yet shows a **download icon** titled *"Movie is downloading"* [f26].
- With the **'Icon for Cutoff Unmet'** option enabled, events whose file quality is below the quality profile cutoff show a **warning icon** titled *"Quality cutoff has not been met"* [f27].

In **Agenda** view, each row carries a release-type icon titled 'Physical Release', 'Digital Release', or 'In Cinemas'. When more than one release type falls on the same day, the icon shows physical over digital, and digital over cinema [f28].

## Calendar Options

The **Options** button opens a settings dialog with two sections that behave differently:

**Local section** — settings stored per browser [f11]:

| Setting | Default |
|---|---|
| Show Movie Information | On [f10] |
| Show Cinema Release / Show Digital Release / Show Physical Release | All on [f10] |
| Icon for Cutoff Unmet | Off [f10] |
| Full Color Events | Off [f10] |

You can't turn off all three release-type checkboxes at once: whichever one is the last still enabled becomes disabled, so at least one release type always stays visible [f10].

**Global section** — First Day of Week, Week Column Header, Time Format, and Enable Color Impaired Mode. Unlike the Local section, these save to the server-side UI settings immediately when changed, so they apply everywhere, not just in this browser [f11].

## Subscribing from an external calendar (iCal Link)

The **iCal Link** button generates a feed URL you can subscribe to from an external calendar app. The feed supports these parameters: days in the past (default 7), days in the future (default 28), tags, unmonitored (default off), and which release types to include (cinema, digital, physical) [f15].

In the feed, each movie produces up to three separate all-day events, with the movie title suffixed '(Theatrical Release)', '(Digital Release)', or '(Physical Release)'. Events for movies still in 'Announced' status are marked Tentative; all others are Confirmed [f19].

Two important support notes:

- **The generated URL contains the user's API key in plaintext.** Anyone with the link can read the feed, so treat shared calendar URLs as secrets [f22].
- The dialog's **'Show as All-Day Events'** checkbox (help text: *"Events will appear as all-day events in your calendar"*) has **no effect**. The feed always emits all-day events regardless of the checkbox [f21].

## Failure paths

| Message (verbatim) | Cause | What to do |
|---|---|---|
| *"Unable to load the calendar"* | Loading calendar data failed | There is no retry button; navigating to another date range or changing the view triggers a fresh load [f20] |
| *"No movies found, to get started you'll want to add a new movie or import some existing ones."* | The library contains no movies at all | Use the 'Import Existing Movies' or 'Add New Movie' buttons shown with the message [f13] |
| *"Events will appear as all-day events in your calendar"* (help text on 'Show as All-Day Events' in the iCal dialog) | Misleading option — the checkbox changes nothing; the feed always produces all-day events | Tell the user events are always all-day; toggling the checkbox will not change their external calendar [f21] |

## Lifecycle: 'Search for Missing' from the Calendar

*"I clicked Search for Missing two hours ago — what state should things be in, and where do I look?"*

**Stage 0 — Is the button even enabled?** (Calendar toolbar)
'Search for Missing' is disabled unless the date range you're currently viewing contains at least one monitored movie that has a cinema release date in the past, no file, and no active download already in the queue [f12]. If the button is greyed out, nothing in view qualifies — try navigating to a range with overdue monitored movies.

**Stage 1 — You click the button.** (Calendar toolbar)
A search command is queued for the qualifying movies. The button shows a spinner and keeps spinning until that specific search command finishes [f25].

**Stage 2 — A release is grabbed.** (Calendar event)
If the search finds an acceptable release, it is grabbed — chosen and sent to the download client. Any resulting grab appears on the movie's calendar event as a queue/downloading indicator [f25]. In the brief window where the release has been grabbed but hasn't shown up in the download queue yet, the event shows a download icon titled *"Movie is downloading"* [f26].

**Stage 3 — The download runs.** (Calendar event)
Once the download is active in the queue, the event shows a circular progress ring reflecting percent complete, with the queue details available in a tooltip [f26]. The event takes the 'Queued' color, which outranks every other status color [f7][f8].

**Stage 4 — Import.** (Calendar event)
When the finished download is imported into the movie's library folder, the calendar refetches automatically — it listens for movie file imports and deletions [f23]. The event then shows as 'Downloaded (Monitored)' [f7][f8].

**Background timing while you wait:**

- The open calendar page auto-refreshes every hour (which also resets the visible range to today), and refetches whenever a movie refresh finishes or movie files are imported or deleted [f23].
- Independent of your manual search, RSS sync — the periodic check of indexer feeds for new releases — runs every 30 minutes by default. The **'RSS Sync'** toolbar button queues that same check on demand and shows a spinner while it executes [f24].

So two hours later: the button should have long stopped spinning [f25]; if a release was grabbed you should see either the *"Movie is downloading"* icon, a progress ring, or a 'Downloaded (Monitored)' event [f25][f26][f7][f8]. If the event is still in the 'Missing (Monitored)' color, no grab resulted from the search [f7][f8].

## For QA

**Boundary behaviors**

- Month view is only the default above 768px window width; below that, Day view is the default and the Month option disappears from the view menu entirely [f2][f3].
- Forecast view clamps to between 3 and 7 columns; the breakpoints fall at multiples of 120px of window width. Previous/Next in Forecast jump by the *visible* day count, so the jump size changes as you resize [f6].
- Agenda view: Previous, Next, and 'Today' are all disabled; the range is always yesterday → one month ahead [f5].
- In the Options dialog, the release-type checkboxes can never all be off — the last enabled one becomes disabled [f10].
- A movie appears if **any** of its three release dates is in range, so the same movie can legitimately appear multiple times in one visible range (once per release date) [f16].
- 'Search for Missing' eligibility is strict: monitored, cinema date in the past, no file, no active queue item — all four required, evaluated against the visible range only [f12].

**Surprising truths**

- The iCal dialog's 'Show as All-Day Events' checkbox does nothing; the feed is always all-day events [f21].
- The iCal URL embeds the API key in plaintext — a shared link is a credential leak [f22].
- Local options are per-browser, but the Global options section saves to server-side UI settings *immediately on change* (no separate save step) [f11].
- The hourly auto-refresh resets the visible range back to today — a tester who navigated elsewhere and left the tab open will find the calendar back at today [f23].
- iCal events for 'Announced'-status movies are marked Tentative, all others Confirmed [f19].
- Agenda release-type icon precedence on same-day multi-releases: physical > digital > cinema [f28].

**API behaviors relevant to test design**

- The calendar data request takes start, end, unmonitored (sent as false when the filter doesn't set it), and optional comma-separated tags; if start/end are omitted the server defaults to today through today + 2 days [f14].
- Tag values may be numeric tag IDs or tag labels; any all-digit value is treated as an ID, never a label [f18].
- Results are sorted by in-cinemas date, then digital release date, then physical release date [f17].
- iCal feed defaults: 7 days past, 28 days future, unmonitored off, with a release-type filter parameter available [f15].

**Existing coverage and gaps**

- Integration tests cover: a monitored movie in range is returned; an unmonitored movie is excluded with unmonitored=false and included with unmonitored=true [f29].
- **Gaps** — no automated tests exist for: the iCal feed (release-type filtering, Tentative/Confirmed status, all-day events), the tags filter on the calendar API, or any frontend calendar component. The calendar has exactly one test file in the entire suite [f30].
