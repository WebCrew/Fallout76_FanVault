# FanVault — verbindlicher Funktionsumfang

Festgehalten am 31. Oktober 2026 und um den vereinbarten Gildenablauf vom 11. November 2026 ergänzt. Dieses Dokument beschreibt das Zielprodukt.

## Konto und Spielersuche

- FanVault ist eine Windows-Overlay-App für Chat und Gilden, zunächst für Fallout 76.
- Ein Net-Twin-Konto und der passende Fallout-76-Gamertag in den Net-Twin-Profileinstellungen sind für den echten Dienst erforderlich.
- Net-Twin bleibt die zentrale Nutzer- und Gamertag-Datenbank. Keine separate FanVault-Registrierung, kein Zugriff auf Bethesda-Konten.
- Mitspieler werden anhand ihres dort angegebenen Gamertags gesucht, auf Net-Twin und aus der App über dieselbe erlaubte Datenquelle. Das Windows-Overlay verwendet für Fallout 76 das eigene PC-Profilfeld „Fallout76 Gamer Tag“.
- Gamertags sind selbst angegeben und werden nicht als verifizierte Spielkonten dargestellt. Sichtbarkeitsregeln sind vor Freischaltung der Suche noch festzulegen.

## Our Guild

- Jede Gilde bekommt in FanVault eine Seite namens **Our Guild**. Ihre Leitung kann einen Avatar und ein Headerbild hochladen, Social Links pflegen und die Tagesansage jederzeit ändern.
- **Our Guild Home** ist ein gut sichtbarer Link unter dem Header. Die Gildenleitung hinterlegt dort die Adresse einer Net-Twin-Gruppe oder -Seite. FanVault prüft die Zieladresse und akzeptiert dafür Net-Twin-Gruppen und -Seiten.
- Die Einstellung **„Ich leite eine Gilde“** öffnet die Einrichtung. FanVault prüft auf dem Server, ob das Konto Inhaber oder Admin des verknüpften Zuhauses ist. Bearbeitungsrechte gelten für diese Gilde und enden, wenn die entsprechende Rolle auf Net-Twin entfällt.
- Die Leitung sucht Mitspieler auf Net-Twin und lädt gezielt die gewünschten Personen ein. Bei Gruppen übernimmt FanVault bestätigte Gruppenmitglieder automatisch. Bei Seiten führt die Leitung auf Net-Twin eine ausdrückliche Gildenliste. FanVault übernimmt daraus die bestätigten Mitglieder. Seiten-Follows und offene Einladungen zählen bei der Übernahme nicht mit.
- Net-Twin ist die Quelle der Gildenliste. FanVault übernimmt Beitritte, Austritte und entfernte Mitglieder automatisch. Bei einem Ausfall der Synchronisierung prüft FanVault die Zugriffsrechte, bevor es geschützte Gildenfunktionen freigibt.
- Ein gewöhnliches Gildenmitglied nutzt sein vorhandenes Net-Twin-Konto und seinen hinterlegten Fallout-76-Gamertag. Die [Schritt-für-Schritt-Anleitung](guild-leader-guide.md) erklärt die Einrichtung und den Beitritt.

## Freunde und Vierergruppen

- Eine Gilde ist nicht auf vier Mitglieder begrenzt. Die Grenze gilt für die einzelne Spiel-/Chatgruppe.
- Auch normale registrierte Spieler können Freunde suchen und in eine Vierergruppe einladen; dafür müssen sie kein Gildenadministrator sein.
- Jede Gruppe hat höchstens vier Teilnehmer **einschließlich des Einladenden**. Einladungen und die Annahme müssen den Platz atomar prüfen; die Oberfläche allein erzwingt diese Grenze nicht.
- Mehrere Vierergruppen innerhalb einer größeren Gilde sind möglich. Gildenrechte, Gruppenteilnahme und globale Administratorrechte sind getrennte Berechtigungen.

## Textchat, Tutorials und Dateien

- Gruppenmitglieder können gemeinsam Textnachrichten austauschen. Vorhandenen Net-Twin-/Sngine-Textchat und dessen Speicherung wiederverwenden, soweit seine Rechte und Funktionen passen.
- Tutorials werden ausschließlich als Chatbeiträge geteilt, zum Beispiel als Text, Bild oder Link. Kein separates Tutorial-Modul, Kursbereich oder redaktionelles Veröffentlichungssystem.
- Bilder und andere ausdrücklich erlaubte Dateien werden ausschließlich als Chat-Anhänge hochgeladen und geteilt. Keine eigenständige Dateibibliothek, Galerie oder allgemeine Upload-Seite.
- Echte Anhänge müssen den berechtigten Teilnehmern zugänglich sein und nach einem Neustart wieder im Verlauf erscheinen. Eine lokale Bildvorschau allein erfüllt diese Funktion nicht.
- Sichere Dateitypen, Größenlimits, Prüfung der Inhalte, berechtigter Abruf und Aufbewahrung sind Bestandteil der Umsetzung. Keine frei ausführbaren Anhänge und keine ungeschützten Privatdatei-Links.
- Avatar und Header gehören zur gesondert gewünschten Profilbearbeitung; sie sind keine Chat-Dateibibliothek.

## Sprachraum

- Optionaler gemeinsamer Sprachraum je Vierergruppe, selbstständig beitreten/verlassen, ohne Klingeln oder Einzelanrufannahme.
- Direkte WebRTC-Audioverbindungen zwischen den PCs, Mikrofon-Stummschaltung und Push-to-Talk.
- Kein eigener Sprachserver und kein zusätzlicher kostenpflichtiger Audiodienst. Shared Hosting übernimmt nur Anmeldung, Rechte, Räume und Verbindungsanbahnung.
- Ohne Weiterleitungsserver können direkte Verbindungen bei einzelnen Netzwerken scheitern; das muss im Test geprüft und in der App ehrlich angezeigt werden.
- Details und Abnahme: [Sprachraum-Spezifikation](voice-rooms.md). Noch nicht implementiert.

## Eigenes kleines Profil in der App

- Jeder Spieler kann sein eigenes Profil anzeigen und bearbeiten: Avatar, Headerbild, optionale Social-Profil-Links und ein kurzer frei formulierbarer Statustext.
- Die Identität bleibt mit dem Net-Twin-Konto verbunden; bestehende Profilfunktionen/-felder möglichst weiterverwenden. Keine doppelte Nutzerregistrierung.
- Andere Spieler können das freigegebene Profil sehen. Persönliche Kontodaten werden nicht automatisch zu öffentlichen Profilfeldern.
- Statusänderungen sind keine zusätzliche Social-Feed-Funktion. Social-Links benötigen keinen eigenen eingebetteten Browser oder eine zweite Anmeldung.

## Overlay und Erweiterbarkeit

- Beim ersten Start ein möglichst mittiges Icon; Klick öffnet die aktuelle vollständige Chat-Oberfläche.
- Icon und geöffnetes Fenster frei verschiebbar, Fenstergröße verstellbar. Position und Größe werden gespeichert und an Bildschirmgrenzen angepasst.
- Gemeinsame Konto-, Chat-, Gruppen- und Overlay-Funktionen von Fallout-spezifischen Einstellungen trennen.
- Eine eigene FanVault-API vermittelt den berechtigten Zugriff auf Net-Twin und ermöglicht später andere Spielvarianten. Keine API-Schlüsselpflicht für normale Spieler oder Gildenleiter.
- Zuerst Fallout 76 fertigstellen. Keine parallelen unfertigen Spielvarianten oder große allgemeine Plugin-Plattform.

## Abnahme und aktuelle Grenze

Zur Abnahme gehören Anmeldung und Suche mit echten Testkonten, eine verknüpfte Gilde mit bearbeitbarer **Our Guild**-Seite sowie die automatische Übernahme eines bestätigten Beitritts und eines Austritts. Danach folgen der Einladungsablauf für Vierergruppen, Profilbearbeitung, Textchat und Anhänge, Sprachraum und Overlay im Spiel. Tests prüfen auch den Zugriff fremder oder ausgetretener Konten und die Grenze von vier Personen je Spielgruppe.

Net-Twin-Anmeldung und Gamertag-Suche wurden im Windows-Pilot getestet. **Our Guild**, Rollenprüfung und Mitgliedersynchronisierung sind der nächste Gilden-Meilenstein. Die übrigen Funktionen werden separat abgenommen.
