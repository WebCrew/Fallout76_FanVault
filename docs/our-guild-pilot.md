# Our Guild — Teststand

1. Melde dich in FanVault unter **Menu → Settings** mit deinem Net-Twin-Konto an. Bestätige den aktuellen App-Code im Browser und warte in der App auf **Signed in as …**. Die Anmeldung auf der Website allein reicht nicht. Wenn der Code abgelaufen ist, starte eine neue Anmeldung.
2. Als Gildenleitung wählst du **Guild Leader Setup**. Kopiere die Adresse deiner Net-Twin-Gruppe in das Feld und bestätige mit **Link Our Guild Home**.
3. Öffne **Menu → Our Guild**, um die Gruppe und ihre bestätigten Mitglieder zu sehen. Über **Our Guild Home** öffnest du die Gruppe im Browser. **Refresh guilds** lädt den aktuellen Stand, falls das Fenster während eines Beitritts oder Austritts offen war.

Die Mitglieder verwaltest du auf Net-Twin. Sobald eine Gruppe verknüpft ist, erscheint sie beim Öffnen von **Our Guild** für ihre bestätigten Mitglieder.

**Members** öffnet die bestätigte Mitgliederliste deiner verknüpften Gilde. **Member Search** öffnet dagegen die Suche nach weiteren Spielern anhand ihres vollständigen Gamertags. Beide Funktionen und **Guild Leader Setup** sind unter **Settings** erreichbar; die Suche bleibt zusätzlich im Menü und in der Mitgliederansicht zugänglich. Ein Suchtreffer allein fügt niemanden zur Gilde hinzu.

Neben jedem Mitglied öffnet das Profil-Symbol dessen Net-Twin-Profil im Browser. Das Symbol für eine Vierergruppen-Einladung ist bereits sichtbar, bleibt bis zur Umsetzung der Einladungsfunktion jedoch deaktiviert.

Seit dem 23. November 2026 ist die Gildenfunktion im Net-Twin-Pilot freigeschaltet. Für die Testgruppe **Nuka Gang** verknüpft das Gruppenadmin-Konto **NetTwin** die Adresse `https://net-twin.de/groups/nukagang`. Danach prüft **Nyra** als bestätigtes Mitglied die Anzeige unter **Our Guild**. Beide Konten sind für die App-Anmeldung freigeschaltet.

Die Serverprüfung bestätigte anhand der aktuellen Net-Twin-Datenbank, dass NetTwin verknüpfen darf, Nyra die Mitgliederliste abrufen darf und beide Konten darin enthalten sind. Am 23. November 2026 wurde die Verknüpfung außerdem erfolgreich in der Windows-App getestet: **Our Guild** zeigt **Nuka Gang**, den Link **Our Guild Home** und die Mitglieder **@NetTwin** und **@Nyra**. Die Anzeige nach Anmeldung als Nyra sowie der Zugriff nach einem echten Austritt stehen noch aus.

## Nächste Verbesserung: geführte Einrichtung

Die Gildenleitung soll künftig durch vier verständliche Schritte geführt werden: **Anmelden → Gilde verknüpfen → Mitglieder prüfen → Fertig**. Jeder Schritt zeigt seinen tatsächlichen Status; die App-Freigabe muss abgeschlossen sein, bevor die Verknüpfung angeboten wird. Ein abgelaufener Code soll direkt einen Neustart der Anmeldung ermöglichen. Die Berechtigung zur Verknüpfung richtet sich weiterhin nach den Gruppenadminrechten auf Net-Twin.

Dieser Entwicklungsstand umfasst Gruppenlink und Mitgliederliste. Gildenbilder, Social Links, Tagesansage, Net-Twin-Seiten als Gilden-Zuhause und der gemeinsame Textchat folgen in weiteren Schritten.

## Server

Installiere `GuildDirectory.php` im privaten FanVault-Ordner und verwende die aktualisierten Dateien `AuthHttp.php` und `public/index.php`. `guilds_enabled` ist in der Beispielkonfiguration deaktiviert. Nach Freigabe des Live-Tests speichert FanVault verknüpfte Gruppen-IDs in seinem vorhandenen privaten SQLite-Speicher. Rollen und Mitgliedschaften werden aus Net-Twin gelesen.

Der lokale HTTP-Test verwendet erfundene Konten. Er deckt eine gültige Verknüpfung, eine wiederholte Anfrage, fehlende Adminrechte, eine fremde Adresse sowie die verweigerte Mitgliederliste nach einem simulierten Austritt ab.
