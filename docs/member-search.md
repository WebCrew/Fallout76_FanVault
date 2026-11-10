# Fallout 76 player search

In the Windows overlay, open **Members** after signing in with Net-Twin and enter the full PC gamertag. FanVault labels gamertags as self-reported. The player running the search also needs a Fallout 76 gamertag in their Net-Twin profile settings.

The search uses the dedicated Net-Twin user textbox **Fallout76 Gamer Tag**. It must be enabled for search. The older generic **Gamer Tag / Player Name** field cannot identify a game. Move an existing value only after its owner confirms it belongs to Fallout 76 on PC. Confirm the value in the new field before removing the old field.

## API and pilot

- Send `POST /fanvault/index.php?action=member-search` with a valid FanVault bearer session and a JSON body containing `game` (`fallout76`), `platform` (`PC`) and `tag`. The query is a full, case-insensitive match. The response contains at most eight player IDs, usernames and self-reported gamertags.
- Search honours account activation and approval, incognito mode, hidden suggestions and blocks in both directions. It excludes the requester and is rate-limited per account and connection address.
- Install `MemberSearch.php` alongside the other private PHP files. Set `member_search_fields` to `['fallout76' => ['PC' => FIELD_ID]]` in the private configuration once the field exists and its visibility has been approved. An empty mapping disables search. Existing sign-in remains usable with the mapping empty.
- Net-Twin's **People → Find** can use custom search fields enabled for search. The global search bar uses Sngine's ordinary name search. The Sngine People search excludes the root admin profile. The FanVault endpoint uses the configured gamertag field and applies the visibility checks above.

The loopback browser test exercises the API with synthetic players and checks anonymous access, foreign origins, exact matching, platform isolation, missing gamertags and sign-out.

The Net-Twin pilot went live on 10 November 2026 with the dedicated PC field and the existing single-account allowlist. Production checks verified that the test account passes the gamertag gate, cannot find itself, and that anonymous requests and foreign origins are rejected. The remaining acceptance test is an authenticated search in the Windows overlay for another account with a tag in the new field. Invitations are a separate feature.
