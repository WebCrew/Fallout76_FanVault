# Fallout 76 player search

In the Windows overlay, open **Members** after signing in with Net-Twin and enter the full PC gamertag. FanVault labels gamertags as self-reported. The player running the search also needs a Fallout 76 gamertag in their Net-Twin profile settings.

The search uses the dedicated Net-Twin user textbox **Fallout76 Gamer Tag**. It must be enabled for search. The older generic **Gamer Tag / Player Name** field cannot identify a game. Move an existing value only after its owner confirms it belongs to Fallout 76 on PC. Confirm the value in the new field before removing the old field.

## API and pilot

- Send `POST /fanvault/index.php?action=member-search` with a valid FanVault bearer session and a JSON body containing `game` (`fallout76`), `platform` (`PC`) and `tag`. The query is a full, case-insensitive match. The response contains at most eight player IDs, usernames and self-reported gamertags.
- Search honours account activation and approval, incognito mode, hidden suggestions and blocks in both directions. It excludes the requester and is rate-limited per account and connection address.
- Install `MemberSearch.php` alongside the other private PHP files. Set `member_search_fields` to `['fallout76' => ['PC' => FIELD_ID]]` in the private configuration once the field exists and its visibility has been approved. An empty mapping disables search. Existing sign-in remains usable with the mapping empty.
- Net-Twin's global search may interpret a tag suffix as a hashtag. The separate **People → Find** filter accepts the full tag but can fail when location search is active.

## Net-Twin website search

The optional form at `/fanvault/players.php` uses the same full-tag lookup, with the user's Net-Twin browser session. Sign in, enter the complete PC gamertag including any `#` suffix, and open a matching profile from the results. The same own-tag requirement and visibility checks apply.

The form is live on Net-Twin and linked from the **Info** section of the FanVault community page. A signed-in browser test verified a match and profile link for a complete tag containing `#`. A guest request returned the sign-in prompt. [FanVault on Net-Twin](https://net-twin.de/pages/FanVault)

Install `WebMemberSearch.php` alongside the existing private PHP files and deploy the updated `AuthHttp.php`, `NetTwinIdentity.php` and public `index.php`. Place the public `players.php` beside `index.php`. Set `web_member_search_enabled` to `true` in the private configuration when ready to enable the website form, and use its URL for the link from the FanVault page on Net-Twin.

The loopback browser test exercises the API with synthetic players and checks anonymous access, foreign origins, exact matching, platform isolation, missing gamertags and sign-out.

The Net-Twin pilot went live on 10 November 2026 with the dedicated PC field and the existing single-account allowlist. Production checks verified that the test account passes the gamertag gate and that anonymous requests and foreign origins are rejected. A manual test in the Windows overlay confirmed that a full gamertag containing `#` finds the other account and that searching for the signed-in account's own gamertag returns no results. Invitations are a separate feature.
