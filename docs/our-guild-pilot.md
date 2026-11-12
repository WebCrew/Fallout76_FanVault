# Our Guild — Teststand

1. Melde dich in FanVault unter **Menu → Settings** mit deinem Net-Twin-Konto an.
2. Als Gildenleitung wählst du **I lead a guild**. Kopiere die Adresse deiner Net-Twin-Gruppe in das Feld und bestätige mit **Link Our Guild Home**.
3. Öffne **Menu → Our Guild**, um die Gruppe und ihre bestätigten Mitglieder zu sehen. Über **Our Guild Home** öffnest du die Gruppe im Browser. **Refresh guilds** lädt den aktuellen Stand, falls das Fenster während eines Beitritts oder Austritts offen war.

Die Mitglieder verwaltest du auf Net-Twin. Sobald eine Gruppe verknüpft ist, erscheint sie beim Öffnen von **Our Guild** für ihre bestätigten Mitglieder. Für den Live-Test brauchen wir ein freigeschaltetes Konto mit Gruppenadmin-Rechten und ein weiteres freigeschaltetes Mitglied. Die Testgruppe ist Nuka Gang. Der Test umfasst auch den Zugriff nach einem Austritt.

Dieser Entwicklungsstand umfasst Gruppenlink und Mitgliederliste. Gildenbilder, Social Links, Tagesansage, Net-Twin-Seiten als Gilden-Zuhause und der gemeinsame Textchat folgen in weiteren Schritten.

## Server

Installiere `GuildDirectory.php` im privaten FanVault-Ordner und verwende die aktualisierten Dateien `AuthHttp.php` und `public/index.php`. `guilds_enabled` ist in der Beispielkonfiguration deaktiviert. Nach Freigabe des Live-Tests speichert FanVault verknüpfte Gruppen-IDs in seinem vorhandenen privaten SQLite-Speicher. Rollen und Mitgliedschaften werden aus Net-Twin gelesen.

Der lokale HTTP-Test verwendet erfundene Konten. Er deckt eine gültige Verknüpfung, eine wiederholte Anfrage, fehlende Adminrechte, eine fremde Adresse sowie die verweigerte Mitgliederliste nach einem simulierten Austritt ab.
