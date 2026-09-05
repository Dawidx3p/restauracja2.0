# AMO — mobilne doświadczenie restauracyjne

AMO to koncepcja strony miejskiego bistro zaprojektowana bardziej jak aplikacja niż klasyczna witryna restauracji. Projekt skraca drogę od „mam ochotę coś zjeść” do znalezienia i zamówienia konkretnego dania.

## Case study

### Problem

Tradycyjne strony restauracji często prezentują długie, tekstowe menu. Na telefonie oznacza to dużo przewijania, niewiele emocji i trudniejszy wybór.

### Rozwiązanie

Projekt opiera się na trzech elementach:

- wizualnej stronie głównej z bestsellerami,
- menu podzielonym na czytelne kategorie i filtry nastroju,
- uproszczonym procesie zamawiania, rezerwacji i konfiguracji zestawów.

Zdjęcia wykorzystano selektywnie — w hero, przy bestsellerach i najważniejszych rekomendacjach. Pozostałe dania mają lekkie kafelki tekstowe, dzięki czemu strona nie zamienia się w galerię.

### Kluczowe doświadczenia

Sekcja **„Na co masz dziś ochotę?”** pozwala wybrać między propozycjami takimi jak „Na szybko”, „Lekko”, „Do 40 zł” czy „Dla dwóch osób”. Zamiast przeglądać całe menu, użytkownik od razu otrzymuje krótszą, dopasowaną listę.

Zestaw **„Wieczór we dwoje”** wykorzystuje dwuetapowy proces. Najpierw użytkownik poznaje ofertę, a po kliknięciu „Zamów zestaw” przechodzi do osobnego konfiguratora dwóch pizz i napojów. Wybrany skład jest zapisywany i czytelnie prezentowany w koszyku.

### Efekt

Powstał responsywny prototyp obejmujący kompletne menu, wyszukiwanie, filtry, szczegóły dań, koszyk, konfigurator zestawu, rezerwację stolika oraz proces składania zamówienia.

Najważniejsza zasada projektu: **najpierw pokazujemy jedzenie, dopiero później szczegóły.**

## Technologie

- HTML5
- CSS3
- JavaScript bez frameworków
- dane menu w JSON
- Local Storage do zachowania koszyka

## Uruchomienie lokalne

Projekt wymaga prostego serwera HTTP, ponieważ menu jest pobierane z pliku JSON.

```bash
python3 -m http.server 4173
```

Następnie otwórz `http://localhost:4173`.

## Struktura projektu

- `index.html` — struktura strony i okien dialogowych,
- `styles.css` — układ, identyfikacja wizualna i responsywność,
- `app.js` — filtrowanie menu, koszyk, rezerwacje i proces zamawiania,
- `data/menu.json` — dane dań, kategorii i zestawów,
- `images/` — wybrane zdjęcia restauracji i bestsellerów,
- `MENU.md` — tekstowa wersja menu.

> Projekt demonstracyjny. Dane restauracji, zamówienia i płatności nie są wysyłane do zewnętrznego systemu.
